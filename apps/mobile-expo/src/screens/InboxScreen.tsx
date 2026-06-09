import { useFonts } from 'expo-font';
import { PTSerif_700Bold } from '@expo-google-fonts/pt-serif';
import {
  UbuntuSansMono_400Regular,
  UbuntuSansMono_600SemiBold,
  UbuntuSansMono_700Bold,
} from '@expo-google-fonts/ubuntu-sans-mono';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, radius } from '@fieldbook/design-system/lib/tokens';

import {
  listInboxMaterials,
  listInboxNotes,
  updateMaterial,
  updateNote,
  listJobsForCurrentUserPage,
  type InboxMaterialItem,
  type InboxNoteItem,
} from '@fieldbook/api-client';
import type {
  JobDetailMaterialBucket,
  JobDetailNoteBucket,
} from '@fieldbook/shared-types';

import { CanvasTiledBackground } from '../components/CanvasTiledBackground';
import {
  ChooseJobBottomSheet,
  SectionHeader,
  ViewMaterialsBuckets,
  ViewNotesBuckets,
  type ChooseJobBottomSheetJob,
} from '../components/ds';
import { SessionSheetBackIcon } from '../components/figma-icons/JobDetailScreenIcons';
import {
  ShellBottomNav,
  shellBottomNavOuterHeight,
  type ShellMainTab,
} from '../components/shell/ShellBottomNav';
import { useJobsListInvalidation } from '../context/JobsListInvalidationContext';
import { analytics, errorProperties } from '../lib/analytics';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  recencyBucket,
  RECENCY_BUCKET_ORDER,
  RECENCY_BUCKET_TITLE,
  type RecencyBucket,
} from '../lib/timeBuckets';
import {
  CONTENT_MAX_WIDTH,
  TOP_HEADER_MAX_WIDTH,
  bg,
  cardShadowRn,
  createTextStyles,
  fg,
  space,
} from '../theme/nativeTokens';

type InboxTab = 'notes' | 'materials';

const ASSIGN_JOBS_PAGE_SIZE = 100;

export type InboxScreenProps = {
  /** Bump to force a refetch when the screen is (re)opened. */
  loadKey?: number;
  onRequestClose: () => void;
  onSelectShellTab: (tab: ShellMainTab) => void;
};

type AssignTarget = { kind: InboxTab; id: string } | null;

async function listAllJobsForAssign(): Promise<ChooseJobBottomSheetJob[]> {
  const jobs: ChooseJobBottomSheetJob[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const page = await listJobsForCurrentUserPage(supabase, {
      limit: ASSIGN_JOBS_PAGE_SIZE,
      offset,
      tab: 'all',
    });
    jobs.push(
      ...page.items.map((j) => ({
        id: j.id,
        shortDescription: j.shortDescription,
        customerName: j.customerName,
      })),
    );
    hasMore = page.hasMore && page.items.length > 0;
    offset += page.items.length;
  }

  return jobs;
}

function groupByRecency<T extends { createdAt: string }>(
  items: T[],
): { bucket: RecencyBucket; items: T[] }[] {
  const nowMs = Date.now();
  const byBucket = new Map<RecencyBucket, T[]>();
  for (const item of items) {
    const b = recencyBucket(null, item.createdAt, nowMs);
    const list = byBucket.get(b);
    if (list) list.push(item);
    else byBucket.set(b, [item]);
  }
  return RECENCY_BUCKET_ORDER.filter((b) => byBucket.has(b)).map((b) => ({
    bucket: b,
    items: byBucket.get(b)!,
  }));
}

/**
 * Inbox screen — quick-capture notes / materials with no parent job. Grouped
 * by recency (TODAY / PAST WEEK / PAST MONTH / OLDER) using the shared
 * `timeBuckets` logic. Tapping an item opens the "Add to Job" sheet; assigning
 * removes it from the Inbox.
 */
export function InboxScreen({ loadKey = 0, onRequestClose, onSelectShellTab }: InboxScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollY = useMemo(() => new Animated.Value(0), []);
  const { invalidateJobsList } = useJobsListInvalidation();

  const [fontsLoaded] = useFonts({
    PTSerif_700Bold,
    UbuntuSansMono_400Regular,
    UbuntuSansMono_600SemiBold,
    UbuntuSansMono_700Bold,
  });

  const typography = useMemo(
    () =>
      createTextStyles({
        serifBold: 'PTSerif_700Bold',
        mono: 'UbuntuSansMono_400Regular',
        monoSemi: 'UbuntuSansMono_600SemiBold',
        monoBold: 'UbuntuSansMono_700Bold',
      }),
    [],
  );

  const [activeTab, setActiveTab] = useState<InboxTab>('notes');
  const [notes, setNotes] = useState<InboxNoteItem[]>([]);
  const [materials, setMaterials] = useState<InboxMaterialItem[]>([]);
  const activeTabRef = useRef<InboxTab>('notes');
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  // Once the user taps a tab we stop auto-selecting based on which inbox has items.
  const userPickedTabRef = useRef(false);
  const selectTab = useCallback((tab: InboxTab) => {
    userPickedTabRef.current = true;
    if (tab !== activeTab) {
      analytics.capture('inbox_tab_changed', {
        from_tab: activeTab,
        to_tab: tab,
        notes_count: notes.length,
        materials_count: materials.length,
      });
    }
    setActiveTab(tab);
  }, [activeTab, materials.length, notes.length]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);

  const [assignTarget, setAssignTarget] = useState<AssignTarget>(null);
  const [assignJobs, setAssignJobs] = useState<ChooseJobBottomSheetJob[]>([]);
  const [assignJobsLoading, setAssignJobsLoading] = useState(false);
  const [assignJobsError, setAssignJobsError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const refetch = useCallback(async (isCancelled: () => boolean) => {
    const startedAt = Date.now();
    if (!isSupabaseConfigured()) {
      if (!isCancelled()) {
        setError('Supabase is not configured.');
        setNotes([]);
        setMaterials([]);
        analytics.capture('supabase_not_configured_seen', {
          screen: 'inbox',
          operation: 'inbox_loaded',
        });
      }
      return;
    }
    if (!isCancelled()) setError(null);
    try {
      const [n, m] = await Promise.all([
        listInboxNotes(supabase),
        listInboxMaterials(supabase),
      ]);
      if (!isCancelled()) {
        setNotes(n);
        setMaterials(m);
        analytics.capture('inbox_loaded', {
          notes_count: n.length,
          materials_count: m.length,
          active_tab: activeTabRef.current,
          load_duration_ms: Date.now() - startedAt,
        });
      }
    } catch (err) {
      if (!isCancelled()) {
        setError(err instanceof Error ? err.message : 'Failed to load inbox.');
        setNotes([]);
        setMaterials([]);
        analytics.capture('inbox_load_failed', {
          active_tab: activeTabRef.current,
          load_duration_ms: Date.now() - startedAt,
          ...errorProperties(err),
        });
      }
    }
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    userPickedTabRef.current = false;
    void (async () => {
      await refetch(() => !alive);
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [loadKey, refetch]);

  // Open to whichever inbox has items: if Notes is empty but Materials has
  // something, land on Materials (and vice versa). Skipped once the user has
  // manually chosen a tab.
  useEffect(() => {
    if (loading || userPickedTabRef.current) return;
    if (notes.length === 0 && materials.length > 0) {
      setActiveTab('materials');
    } else if (materials.length === 0 && notes.length > 0) {
      setActiveTab('notes');
    }
  }, [loading, notes, materials]);

  const noteGroups = useMemo(() => groupByRecency(notes), [notes]);
  const materialGroups = useMemo(() => groupByRecency(materials), [materials]);

  const openAssign = useCallback((kind: InboxTab, id: string) => {
    const startedAt = Date.now();
    const item =
      kind === 'notes'
        ? notes.find((n) => n.id === id)
        : materials.find((m) => m.id === id);
    analytics.capture('inbox_item_selected', {
      kind,
      item_id: id,
      age_bucket: item ? recencyBucket(null, item.createdAt, Date.now()) : null,
    });
    setAssignTarget({ kind, id });
    setAssignJobsError(null);
    setAssignJobsLoading(true);
    void (async () => {
      if (!isSupabaseConfigured()) {
        setAssignJobsError('Supabase is not configured.');
        setAssignJobsLoading(false);
        return;
      }
      try {
        const jobs = await listAllJobsForAssign();
        setAssignJobs(jobs);
        analytics.capture('inbox_assign_sheet_opened', {
          kind,
          available_job_count: jobs.length,
          load_duration_ms: Date.now() - startedAt,
        });
      } catch (err) {
        setAssignJobsError(err instanceof Error ? err.message : 'Could not load jobs.');
        analytics.capture('inbox_assign_jobs_load_failed', {
          kind,
          load_duration_ms: Date.now() - startedAt,
          ...errorProperties(err),
        });
      } finally {
        setAssignJobsLoading(false);
      }
    })();
  }, [materials, notes]);

  const closeAssign = useCallback(() => {
    setAssignTarget(null);
  }, []);

  const onAssignToJob = useCallback(
    async (jobId: string) => {
      if (!assignTarget || assigning) return;
      if (!isSupabaseConfigured()) {
        Alert.alert('Assign failed', 'Supabase is not configured.');
        return;
      }
      const target = assignTarget;
      setAssigning(true);
      try {
        if (target.kind === 'notes') {
          await updateNote(supabase, target.id, { sessionId: null, jobId });
          setNotes((prev) => prev.filter((n) => n.id !== target.id));
        } else {
          await updateMaterial(supabase, target.id, { sessionId: null, jobId });
          setMaterials((prev) => prev.filter((m) => m.id !== target.id));
        }
        analytics.capture('inbox_item_assigned_to_job', {
          kind: target.kind,
          item_id: target.id,
          job_id: jobId,
        });
        setAssignTarget(null);
        invalidateJobsList();
      } catch (e) {
        analytics.capture('inbox_item_assign_failed', {
          kind: target.kind,
          item_id: target.id,
          job_id: jobId,
          ...errorProperties(e),
        });
        Alert.alert('Assign failed', e instanceof Error ? e.message : 'Could not add to job.');
      } finally {
        setAssigning(false);
      }
    },
    [assignTarget, assigning, invalidateJobsList],
  );

  const bottomNavReservedHeight = shellBottomNavOuterHeight(insets.bottom);

  if (!fontsLoaded) {
    return (
      <View style={styles.root}>
        <CanvasTiledBackground scrollY={scrollY} contentHeight={scrollContentHeight} />
      </View>
    );
  }

  const activeEmpty =
    activeTab === 'notes' ? noteGroups.length === 0 : materialGroups.length === 0;

  return (
    <View style={styles.root}>
      <CanvasTiledBackground scrollY={scrollY} contentHeight={scrollContentHeight} />
      <Animated.ScrollView
        style={[styles.scroll]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        onContentSizeChange={(_w, h) => setScrollContentHeight(h)}
        scrollEventThrottle={16}
        contentContainerStyle={{
          width: '100%',
          paddingTop: Math.max(0, insets.top - space('Spacing/6')),
          paddingBottom: space('Spacing/20') + bottomNavReservedHeight,
          alignItems: 'center',
        }}
      >
        <View style={[styles.topHeader, { maxWidth: TOP_HEADER_MAX_WIDTH }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onRequestClose}
            hitSlop={12}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <SessionSheetBackIcon color={fg.primary} />
          </Pressable>
          <Text style={typography.displayH1}>INBOX</Text>
        </View>

        <View style={[styles.tabsWrap, { maxWidth: CONTENT_MAX_WIDTH }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: activeTab === 'notes' }}
            onPress={() => selectTab('notes')}
            style={({ pressed }) => [
              activeTab === 'notes' ? styles.tabActive : styles.tabIdle,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                typography.statusPillLabel,
                styles.tabLabel,
                { color: activeTab === 'notes' ? fg.primary : fg.secondary },
              ]}
            >
              Notes
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: activeTab === 'materials' }}
            onPress={() => selectTab('materials')}
            style={({ pressed }) => [
              activeTab === 'materials' ? styles.tabActive : styles.tabIdle,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                typography.statusPillLabel,
                styles.tabLabel,
                { color: activeTab === 'materials' ? fg.primary : fg.secondary },
              ]}
            >
              Materials
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator
            color={color('Brand/Primary')}
            style={{ marginTop: space('Spacing/32') }}
          />
        ) : error != null && error !== '' ? (
          <Text
            style={[
              typography.bodySmall,
              styles.inlineError,
              { color: color('Semantic/Status/Error/Text') },
            ]}
          >
            {error}
          </Text>
        ) : activeEmpty ? (
          <View style={[styles.emptyWrap, { maxWidth: CONTENT_MAX_WIDTH }]}>
            <Text style={[typography.body, { color: fg.secondary, textAlign: 'center' }]}>
              {activeTab === 'notes'
                ? 'All caught up! No unassigned notes.'
                : 'All caught up! No unassigned materials.'}
            </Text>
          </View>
        ) : activeTab === 'notes' ? (
          noteGroups.map((group) => {
            const bucket: JobDetailNoteBucket = {
              id: `notes-${group.bucket}`,
              kind: 'unassigned',
              notes: group.items,
            };
            return (
              <View key={group.bucket} style={styles.groupWrap}>
                <SectionHeader
                  title={RECENCY_BUCKET_TITLE[group.bucket]}
                  tone="accent"
                  typography={typography}
                />
                <ViewNotesBuckets
                  buckets={[bucket]}
                  typography={typography}
                  onNotePress={(id) => openAssign('notes', id)}
                />
              </View>
            );
          })
        ) : (
          materialGroups.map((group) => {
            const bucket: JobDetailMaterialBucket = {
              id: `materials-${group.bucket}`,
              kind: 'unassigned',
              items: group.items,
            };
            return (
              <View key={group.bucket} style={styles.groupWrap}>
                <SectionHeader
                  title={RECENCY_BUCKET_TITLE[group.bucket]}
                  tone="accent"
                  typography={typography}
                />
                <ViewMaterialsBuckets
                  buckets={[bucket]}
                  typography={typography}
                  onMaterialPress={(id) => openAssign('materials', id)}
                />
              </View>
            );
          })
        )}
      </Animated.ScrollView>

      <View style={styles.bottomNavWrap}>
        <ShellBottomNav selected="jobs" onSelect={onSelectShellTab} />
      </View>

      <ChooseJobBottomSheet
        typography={typography}
        visible={assignTarget !== null}
        jobs={assignJobs}
        loading={assignJobsLoading}
        error={assignJobsError}
        busy={assigning}
        onClose={closeAssign}
        onBack={closeAssign}
        onSelect={(jobId) => void onAssignToJob(jobId)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', backgroundColor: bg.canvasWarm },
  scroll: { flex: 1, width: '100%', backgroundColor: 'transparent', zIndex: 1 },
  topHeader: {
    width: '100%',
    paddingHorizontal: space('Spacing/20'),
    paddingTop: space('Spacing/16'),
    paddingBottom: space('Spacing/8'),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: space('Spacing/12'),
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -space('Spacing/8'),
  },
  tabsWrap: {
    width: '100%',
    marginTop: space('Spacing/12'),
    backgroundColor: bg.subtle,
    borderRadius: radius('Radius/Full'),
    padding: space('Spacing/4'),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabActive: {
    flex: 1,
    backgroundColor: bg.surfaceWhite,
    borderRadius: radius('Radius/Full'),
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    ...cardShadowRn,
  },
  tabIdle: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    textTransform: 'uppercase',
  },
  groupWrap: {
    width: '100%',
    maxWidth: TOP_HEADER_MAX_WIDTH,
    alignItems: 'center',
  },
  inlineError: {
    textAlign: 'center',
    marginTop: space('Spacing/32'),
    paddingHorizontal: space('Spacing/20'),
  },
  emptyWrap: {
    width: '100%',
    paddingHorizontal: space('Spacing/20'),
    paddingTop: space('Spacing/40'),
  },
  bottomNavWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  pressed: { opacity: 0.75 },
});
