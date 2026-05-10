import { useFonts } from 'expo-font';
import { PTSerif_700Bold } from '@expo-google-fonts/pt-serif';
import {
  UbuntuSansMono_400Regular,
  UbuntuSansMono_600SemiBold,
  UbuntuSansMono_700Bold,
} from '@expo-google-fonts/ubuntu-sans-mono';
import {
  createBlankJobForLiveSessionStart,
  deleteJobById,
  getWeeklyNetEarningsCentsForCurrentUser,
  listJobsForCurrentUserPage,
  listRecentDetailedJobsForCurrentUser,
  listRecentJobsForCurrentUser,
  tryBumpJobToInProgressIfNotStarted,
  type ListJobsForCurrentUserItem,
  type RecentJobItem,
} from '@fieldbook/api-client';
import { color, radius } from '@fieldbook/design-system/lib/tokens';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CanvasTiledBackground } from '../components/CanvasTiledBackground';
import {
  IncompleteJobRowCard,
  JobCard,
  MetricSnapshotCard,
  QuickActionsBottomSheet,
  SectionHeader,
} from '../components/ds';
import { HomeJumpBackInIcon, HomeNeedsAttentionIcon } from '../components/figma-icons/HomeSectionIcons';
import { JobDetailIconViewSessionChevron } from '../components/figma-icons/JobDetailScreenIcons';
import { JobsFabPlusIcon } from '../components/figma-icons/JobsScreenIcons';
import { TopHeaderProfileIcon } from '../components/figma-icons/TopHeaderIcons';
import { shellBottomNavOuterHeight } from '../components/shell/ShellBottomNav';
import { useJobsListInvalidation } from '../context/JobsListInvalidationContext';
import { useHasLiveSession, useLiveSession } from '../context/LiveSessionContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  CONTENT_MAX_WIDTH,
  TOP_HEADER_MAX_WIDTH,
  bg,
  cardShadowRn,
  createTextStyles,
  fg,
  space,
} from '../theme/nativeTokens';

const OPEN_TAB_PAGE_SIZE = 20;
const NEEDS_ATTENTION_PREVIEW_MAX = 3;

const HOME_PILL_TO_MISSING: Record<string, string> = {
  'NO SHORT DESCRIPTION': 'Description',
  'NO REVENUE': 'Revenue',
  'NO MATERIALS': 'Materials',
  'NO SESSIONS': 'Sessions',
};

function incompletePillsFor(job: ListJobsForCurrentUserItem): string[] {
  const pills: string[] = [];
  const desc = job.shortDescription.trim();
  if (desc === '' || desc === 'Untitled Job') pills.push('NO SHORT DESCRIPTION');
  if (job.revenueCents == null || job.revenueCents === 0) pills.push('NO REVENUE');
  if (!job.hasMaterials && !job.noMaterialsConfirmed) pills.push('NO MATERIALS');
  if (!job.hasSessions) pills.push('NO SESSIONS');
  return pills;
}

function missingFieldsLabelsForHome(job: ListJobsForCurrentUserItem): string[] {
  return incompletePillsFor(job).map((p) => HOME_PILL_TO_MISSING[p] ?? p);
}

function formatWeeklyUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export type HomeScreenProps = {
  onOpenProfile: () => void;
  onOpenJobDetail: (jobId?: string, options?: { initialEditOpen?: boolean }) => void;
};

function formatLiveSessionJobTitle(now: Date): string {
  const monthDay = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(now);
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now);
  return `Live Session ${monthDay} at ${time}`;
}

export function HomeScreen({ onOpenProfile, onOpenJobDetail }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollY = useMemo(() => new Animated.Value(0), []);
  const hasLiveSession = useHasLiveSession();
  const { startLiveSession, refresh: refreshLiveSession } = useLiveSession();
  const { invalidateJobsList, version } = useJobsListInvalidation();

  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
  const [recentJobs, setRecentJobs] = useState<RecentJobItem[]>([]);
  const [recentJobsLoading, setRecentJobsLoading] = useState(false);
  const [recentJobsError, setRecentJobsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [homeLoading, setHomeLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [weeklyNetCents, setWeeklyNetCents] = useState(0);
  const [incompleteJobs, setIncompleteJobs] = useState<ListJobsForCurrentUserItem[]>([]);
  const [recentJobsDetail, setRecentJobsDetail] = useState<ListJobsForCurrentUserItem[]>([]);
  const [needsAttentionExpanded, setNeedsAttentionExpanded] = useState(false);
  /** Lined canvas height — same pattern as JobDetail (`CanvasTiledBackground` + `onContentSizeChange`). */
  const [scrollContentHeight, setScrollContentHeight] = useState(0);

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

  const runHomeFetch = useCallback(async (isCancelled: () => boolean) => {
    if (!isSupabaseConfigured()) {
      if (!isCancelled()) {
        setHomeError('Supabase is not configured.');
        setWeeklyNetCents(0);
        setIncompleteJobs([]);
        setRecentJobsDetail([]);
      }
      return;
    }
    if (!isCancelled()) setHomeError(null);
    try {
      const [weekly, openPage, recent] = await Promise.all([
        getWeeklyNetEarningsCentsForCurrentUser(supabase),
        listJobsForCurrentUserPage(supabase, {
          limit: OPEN_TAB_PAGE_SIZE,
          offset: 0,
          tab: 'open',
        }),
        listRecentDetailedJobsForCurrentUser(supabase, { limit: 3 }),
      ]);
      if (!isCancelled()) {
        setWeeklyNetCents(weekly.netEarningsCents);
        setIncompleteJobs(openPage.items.filter((j) => !j.isFinanciallyComplete));
        setRecentJobsDetail(recent);
      }
    } catch (err) {
      if (!isCancelled()) {
        setHomeError(err instanceof Error ? err.message : 'Failed to load home.');
        setWeeklyNetCents(0);
        setIncompleteJobs([]);
        setRecentJobsDetail([]);
      }
    }
  }, []);

  useEffect(() => {
    let alive = true;
    setHomeLoading(true);
    void (async () => {
      await runHomeFetch(() => !alive);
      if (alive) setHomeLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [version, runHomeFetch]);

  useEffect(() => {
    setNeedsAttentionExpanded(false);
  }, [version]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await runHomeFetch(() => false);
    } finally {
      setRefreshing(false);
    }
  }, [runHomeFetch]);

  useEffect(() => {
    if (!quickActionsVisible) return;
    setActionError(null);
    let cancelled = false;
    setRecentJobsLoading(true);
    setRecentJobsError(null);
    void (async () => {
      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setRecentJobsError('Supabase is not configured.');
          setRecentJobsLoading(false);
        }
        return;
      }
      try {
        const items = await listRecentJobsForCurrentUser(supabase, { limit: 3 });
        if (!cancelled) {
          setRecentJobs(items);
        }
      } catch (err) {
        if (!cancelled) {
          setRecentJobsError(err instanceof Error ? err.message : 'Could not load jobs.');
        }
      } finally {
        if (!cancelled) {
          setRecentJobsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quickActionsVisible]);

  const onSelectExistingJob = useCallback(
    async (job: RecentJobItem) => {
      if (!isSupabaseConfigured()) {
        setActionError('Supabase is not configured.');
        return;
      }
      setActionError(null);
      setStarting(true);
      try {
        await startLiveSession({
          jobId: job.id,
          jobShortDescription: job.shortDescription,
        });
        await tryBumpJobToInProgressIfNotStarted(supabase, job.id);
        setQuickActionsVisible(false);
        invalidateJobsList();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[HomeScreen] startLiveSession (existing job)', err);
        void refreshLiveSession();
        setActionError(err instanceof Error ? err.message : 'Could not start session.');
      } finally {
        setStarting(false);
      }
    },
    [invalidateJobsList, refreshLiveSession, startLiveSession],
  );

  const onStartNewSession = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setActionError('Supabase is not configured.');
      return;
    }
    const shortDescription = formatLiveSessionJobTitle(new Date());
    let createdJobId: string | null = null;
    setActionError(null);
    setStarting(true);
    try {
      createdJobId = await createBlankJobForLiveSessionStart(supabase, { shortDescription });
      await startLiveSession({ jobId: createdJobId, jobShortDescription: shortDescription });
      await tryBumpJobToInProgressIfNotStarted(supabase, createdJobId);
      setQuickActionsVisible(false);
      invalidateJobsList();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[HomeScreen] startLiveSession (new job)', err);
      let recoveredJobId: string | null = null;
      try {
        const recovered = await refreshLiveSession();
        recoveredJobId = recovered?.jobId ?? null;
      } catch {
        // Refresh is best-effort recovery; cleanup below still protects the quick job.
      }
      if (createdJobId && recoveredJobId === createdJobId) {
        setQuickActionsVisible(false);
        invalidateJobsList();
        return;
      }
      if (createdJobId) {
        try {
          await deleteJobById(supabase, createdJobId);
          invalidateJobsList();
        } catch (cleanupErr) {
          // eslint-disable-next-line no-console
          console.error('[HomeScreen] cleanup orphaned quick-session job failed', cleanupErr);
        }
      }
      setActionError(err instanceof Error ? err.message : 'Could not start session.');
    } finally {
      setStarting(false);
    }
  }, [invalidateJobsList, refreshLiveSession, startLiveSession]);

  const headerTopPad = Math.max(insets.top - space('Spacing/12'), 0);
  /** Clear FAB (56px) from bottom of shell main + small gap; avoid stacking full nav-height padding in the inner scroll. */
  const HOME_FAB_DIAMETER = 56;
  const scrollBottomPad = fabBottomOffset(insets) + HOME_FAB_DIAMETER + space('Spacing/12');

  const needNeedsAttentionExpand = incompleteJobs.length > NEEDS_ATTENTION_PREVIEW_MAX;
  const shownIncompleteJobs =
    !needNeedsAttentionExpand || needsAttentionExpanded
      ? incompleteJobs
      : incompleteJobs.slice(0, NEEDS_ATTENTION_PREVIEW_MAX);

  if (!fontsLoaded) {
    return (
      <View style={styles.root}>
        <CanvasTiledBackground scrollY={scrollY} contentHeight={scrollContentHeight} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CanvasTiledBackground scrollY={scrollY} contentHeight={scrollContentHeight} />
      <View
        pointerEvents="none"
        style={[styles.safeAreaTopAccentWrap, { top: 0, maxWidth: TOP_HEADER_MAX_WIDTH }]}
      >
        <View style={styles.topAccent} />
      </View>
      <Animated.ScrollView
        style={[styles.scroll, { paddingTop: headerTopPad }]}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: scrollBottomPad,
          },
        ]}
        onContentSizeChange={(_w, h) => setScrollContentHeight(h)}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color('Brand/Primary')} />
        }
      >
        <View style={styles.headerBand}>
          <View style={[styles.topHeader, { maxWidth: TOP_HEADER_MAX_WIDTH }]}>
            <Text style={typography.displayH1}>FIELD BOOK</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profile"
              onPress={onOpenProfile}
              hitSlop={12}
              style={({ pressed }) => [styles.profileHit, pressed && styles.pressed]}
            >
              <TopHeaderProfileIcon color={fg.primary} size={20} />
            </Pressable>
          </View>
        </View>

        <View style={styles.modulesColumn}>
          {homeLoading ? (
            <ActivityIndicator
              color={color('Brand/Primary')}
              style={{ marginTop: space('Spacing/24'), marginBottom: space('Spacing/16') }}
            />
          ) : null}
          {homeError != null && homeError !== '' ? (
            <Text
              style={[typography.bodySmall, styles.homeError, { color: color('Semantic/Status/Error/Text') }]}
            >
              {homeError}
            </Text>
          ) : null}

          <SectionHeader
            title="WEEKLY SNAPSHOT"
            subtitle="Jobs worked in the 7 days"
            tone="neutral"
            typography={typography}
          />
          <MetricSnapshotCard
            label="NET EARNINGS"
            value={formatWeeklyUsd(weeklyNetCents)}
            valueTone="success"
            typography={typography}
          />

          {incompleteJobs.length > 0 ? (
            <>
              <SectionHeader
                title="NEEDS ATTENTION"
                tone="accent"
                typography={typography}
                leadingIcon={<HomeNeedsAttentionIcon color={color('Brand/Accent')} />}
              />
              <View style={styles.needsAttentionBlock}>
                {shownIncompleteJobs.map((job) => (
                  <View key={job.id} style={styles.needsAttentionRowWrap}>
                    <IncompleteJobRowCard
                      title={job.shortDescription.trim() || 'Untitled Job'}
                      missingFields={missingFieldsLabelsForHome(job)}
                      typography={typography}
                      onPress={() => onOpenJobDetail(job.id)}
                    />
                  </View>
                ))}
                {needNeedsAttentionExpand ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={needsAttentionExpanded ? 'Show fewer jobs' : 'Show all jobs'}
                    onPress={() => setNeedsAttentionExpanded((e) => !e)}
                    style={({ pressed }) => [styles.needsAttentionFooter, pressed && styles.pressed]}
                  >
                    <Text style={[typography.bodySmall, { color: fg.secondary }]}>
                      {shownIncompleteJobs.length} of {incompleteJobs.length} jobs
                    </Text>
                    <View style={needsAttentionExpanded ? styles.chevronUp : undefined}>
                      <JobDetailIconViewSessionChevron color={fg.secondary} />
                    </View>
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}

          {recentJobsDetail.length > 0 ? (
            <>
              <SectionHeader
                title="JUMP BACK IN"
                tone="neutral"
                typography={typography}
                leadingIcon={<HomeJumpBackInIcon color={fg.secondary} />}
              />
              <View style={styles.jumpBackList}>
                {recentJobsDetail.map((job) => (
                  <View key={job.id} style={styles.jumpBackRowWrap}>
                    <JobCard
                      job={job}
                      typography={typography}
                      recencyLabelMode="lastUpdated"
                      onPress={() => onOpenJobDetail(job.id)}
                    />
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </Animated.ScrollView>

      {hasLiveSession || quickActionsVisible ? null : (
        <View style={[styles.fabWrap, { bottom: fabBottomOffset(insets) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quick capture"
            onPress={() => setQuickActionsVisible(true)}
            style={({ pressed }) => [styles.fabCircle, pressed && styles.pressed]}
          >
            <JobsFabPlusIcon color={bg.canvasWarm} size={28} />
          </Pressable>
        </View>
      )}

      <Modal
        visible={quickActionsVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setQuickActionsVisible(false)}
      >
        <View style={styles.modalHost}>
          <QuickActionsBottomSheet
            typography={typography}
            visible={quickActionsVisible}
            recentJobs={recentJobs}
            recentJobsLoading={recentJobsLoading}
            recentJobsError={recentJobsError}
            actionError={actionError}
            starting={starting}
            onClose={() => setQuickActionsVisible(false)}
            onSelectExistingJob={onSelectExistingJob}
            onStartNewSession={onStartNewSession}
          />
        </View>
      </Modal>
    </View>
  );
}

function fabBottomOffset(insets: { bottom: number }): number {
  return (
    space('Spacing/8') +
    insets.bottom +
    64 +
    space('Spacing/12') -
    shellBottomNavOuterHeight(insets.bottom)
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', backgroundColor: bg.canvasWarm },
  modalHost: { flex: 1 },
  scroll: { flex: 1, width: '100%', backgroundColor: 'transparent' },
  scrollContent: {
    alignItems: 'stretch',
  },
  safeAreaTopAccentWrap: {
    position: 'absolute',
    width: '100%',
    alignSelf: 'center',
    zIndex: 5,
  },
  topAccent: {
    width: '100%',
    height: 6,
    backgroundColor: color('Brand/Accent'),
  },
  headerBand: {
    width: '100%',
    alignItems: 'center',
  },
  modulesColumn: {
    width: '100%',
    maxWidth: TOP_HEADER_MAX_WIDTH,
    alignItems: 'center',
  },
  homeError: {
    textAlign: 'center',
    marginBottom: space('Spacing/12'),
    maxWidth: CONTENT_MAX_WIDTH,
  },
  needsAttentionBlock: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    gap: space('Spacing/8'),
  },
  needsAttentionRowWrap: {
    width: '100%',
    alignItems: 'center',
  },
  needsAttentionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space('Spacing/8'),
    paddingVertical: space('Spacing/8'),
  },
  chevronUp: { transform: [{ rotate: '180deg' }] },
  jumpBackList: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    gap: space('Spacing/8'),
  },
  jumpBackRowWrap: {
    width: '100%',
  },
  topHeader: {
    width: '100%',
    paddingHorizontal: space('Spacing/20'),
    paddingTop: space('Spacing/32'),
    paddingBottom: space('Spacing/16'),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileHit: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
  fabWrap: {
    position: 'absolute',
    right: space('Spacing/24'),
    zIndex: 20,
  },
  fabCircle: {
    width: 56,
    height: 56,
    borderRadius: radius('Radius/Full'),
    backgroundColor: color('Brand/Primary'),
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadowRn,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
