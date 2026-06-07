import { useFonts } from 'expo-font';
import { PTSerif_700Bold } from '@expo-google-fonts/pt-serif';
import {
  UbuntuSansMono_400Regular,
  UbuntuSansMono_600SemiBold,
  UbuntuSansMono_700Bold,
} from '@expo-google-fonts/ubuntu-sans-mono';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { JobDetailIconTopClose } from '../components/figma-icons/JobDetailScreenIcons';
import {
  ShellBottomNav,
  shellBottomNavOuterHeight,
  type ShellMainTab,
} from '../components/shell/ShellBottomNav';
import { useJobsListInvalidation } from '../context/JobsListInvalidationContext';
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

export type InboxScreenProps = {
  /** Bump to force a refetch when the screen is (re)opened. */
  loadKey?: number;
  onRequestClose: () => void;
  onSelectShellTab: (tab: ShellMainTab) => void;
};

type AssignTarget = { kind: InboxTab; id: string } | null;

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);

  const [assignTarget, setAssignTarget] = useState<AssignTarget>(null);
  const [assignJobs, setAssignJobs] = useState<ChooseJobBottomSheetJob[]>([]);
  const [assignJobsLoading, setAssignJobsLoading] = useState(false);
  const [assignJobsError, setAssignJobsError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const refetch = useCallback(async (isCancelled: () => boolean) => {
    if (!isSupabaseConfigured()) {
      if (!isCancelled()) {
        setError('Supabase is not configured.');
        setNotes([]);
        setMaterials([]);
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
      }
    } catch (err) {
      if (!isCancelled()) {
        setError(err instanceof Error ? err.message : 'Failed to load inbox.');
        setNotes([]);
        setMaterials([]);
      }
    }
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      await refetch(() => !alive);
      if (alive) setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [loadKey, refetch]);

  const noteGroups = useMemo(() => groupByRecency(notes), [notes]);
  const materialGroups = useMemo(() => groupByRecency(materials), [materials]);

  const openAssign = useCallback((kind: InboxTab, id: string) => {
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
        const page = await listJobsForCurrentUserPage(supabase, {
          limit: 100,
          offset: 0,
          tab: 'all',
        });
        setAssignJobs(
          page.items.map((j) => ({
            id: j.id,
            shortDescription: j.shortDescription,
            customerName: j.customerName,
          })),
        );
      } catch (err) {
        setAssignJobsError(err instanceof Error ? err.message : 'Could not load jobs.');
      } finally {
        setAssignJobsLoading(false);
      }
    })();
  }, []);

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
        setAssignTarget(null);
        invalidateJobsList();
      } catch (e) {
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

  const noteCount = notes.length;
  const materialCount = materials.length;
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
            accessibilityLabel="Close inbox"
            onPress={onRequestClose}
            style={({ pressed }) => [styles.closeCircle, pressed && styles.pressed]}
          >
            <JobDetailIconTopClose color={fg.primary} />
          </Pressable>
          <Text style={typography.displayH1}>INBOX</Text>
          <View style={styles.closeCircle} />
        </View>

        <View style={[styles.headerCopyWrap, { maxWidth: CONTENT_MAX_WIDTH }]}>
          <Text style={[typography.bodySmall, { color: fg.secondary, textAlign: 'center' }]}>
            Quick captures waiting to be assigned to a job
          </Text>
        </View>

        <View style={[styles.tabsWrap, { maxWidth: CONTENT_MAX_WIDTH }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: activeTab === 'notes' }}
            onPress={() => setActiveTab('notes')}
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
              Notes ({noteCount})
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: activeTab === 'materials' }}
            onPress={() => setActiveTab('materials')}
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
              Materials ({materialCount})
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
                ? 'No unassigned notes. Quick-capture a note from Home.'
                : 'No unassigned materials. Quick-capture a material from Home.'}
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
                  tone="neutral"
                  typography={typography}
                />
                <ViewNotesBuckets
                  buckets={[bucket]}
                  typography={typography}
                  hideBucketHeaders
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
                  tone="neutral"
                  typography={typography}
                />
                <ViewMaterialsBuckets
                  buckets={[bucket]}
                  typography={typography}
                  hideBucketHeaders
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
  scroll: { flex: 1, width: '100%', backgroundColor: 'transparent' },
  topHeader: {
    width: '100%',
    paddingHorizontal: space('Spacing/20'),
    paddingTop: space('Spacing/16'),
    paddingBottom: space('Spacing/8'),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeCircle: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopyWrap: {
    width: '100%',
    paddingHorizontal: space('Spacing/20'),
    paddingBottom: space('Spacing/8'),
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
