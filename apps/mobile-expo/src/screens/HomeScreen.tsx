import { useFonts } from 'expo-font';
import { PTSerif_700Bold } from '@expo-google-fonts/pt-serif';
import {
  UbuntuSansMono_400Regular,
  UbuntuSansMono_600SemiBold,
  UbuntuSansMono_700Bold,
} from '@expo-google-fonts/ubuntu-sans-mono';
import {
  createBlankJobForLiveSessionStart,
  createMaterial,
  createNote,
  deleteJobById,
  fetchJobDetail,
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
  Alert,
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
  ChooseJobBottomSheet,
  ChooseSessionBottomSheet,
  DropdownBottomSheet,
  EditMaterialBottomSheet,
  EditNoteBottomSheet,
  IncompleteJobRowCard,
  JobCard,
  MetricSnapshotCard,
  PendingPaymentRowCard,
  QuickActionsBottomSheet,
  SectionHeader,
  WorkedNotMarkedCompleteRowCard,
  type ChooseJobBottomSheetJob,
  type ChooseSessionBottomSheetSession,
  type DropdownBottomSheetOption,
  type EditMaterialBottomSheetValues,
  type EditNoteBottomSheetValues,
  type QuickActionsRecentJob,
  type QuickActionsStep,
  type QuickCaptureKind,
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
const NEEDS_ATTENTION_PREVIEW_MAX = 10;

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

/** Financially complete in-progress jobs with work that still need to be marked complete. */
function needsReviewMarkComplete(job: ListJobsForCurrentUserItem): boolean {
  if (!job.isFinanciallyComplete || job.lastWorkedAt == null) return false;
  return job.workStatus === 'inProgress';
}

function needsReviewPayment(job: ListJobsForCurrentUserItem): boolean {
  return (
    job.workStatus === 'completed' &&
    (job.jobPaymentState == null || job.jobPaymentState === 'pending')
  );
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
  /** Navigate to the Earnings tab (Past Week) — fired by the weekly snapshot card. */
  onOpenEarnings: () => void;
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

/** Capture is either headed to the Inbox (no parent) or attached to a job. */
type CaptureMode = 'inbox' | 'job';

/** Active sub-sheet in the quick-capture flow (swapped within the same modal). */
type CaptureStep =
  | 'idle'
  | 'noteEdit'
  | 'materialEdit'
  | 'chooseJob'
  | 'noteSession'
  | 'materialSession'
  | 'materialUnit';

type CaptureJob = {
  id: string;
  shortDescription: string;
  customerName: string | null;
};

const CAPTURE_UNIT_OPTIONS: DropdownBottomSheetOption[] = (
  ['ea', 'ft', 'pcs', 'kit', 'lb', 'gal', 'lot'] as const
).map((u) => ({ id: u, label: u, value: u }));

function formatCaptureError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (
    typeof e === 'object' &&
    e !== null &&
    'message' in e &&
    typeof (e as { message: unknown }).message === 'string'
  ) {
    return (e as { message: string }).message;
  }
  return String(e);
}

export function HomeScreen({ onOpenProfile, onOpenJobDetail, onOpenEarnings }: HomeScreenProps) {
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

  // ---- Quick capture (note / material) -------------------------------------
  // The QuickActions step is controlled here so a capture sub-sheet's Back
  // returns to the matching chooser instead of resetting to the tiles.
  const [qaStep, setQaStep] = useState<QuickActionsStep>('quickCapture');
  const [captureStep, setCaptureStep] = useState<CaptureStep>('idle');
  const [captureKind, setCaptureKind] = useState<QuickCaptureKind>('note');
  const [captureMode, setCaptureMode] = useState<CaptureMode>('inbox');
  const [captureJob, setCaptureJob] = useState<CaptureJob | null>(null);
  const [captureSessions, setCaptureSessions] = useState<ChooseSessionBottomSheetSession[]>([]);
  const [captureSaving, setCaptureSaving] = useState(false);
  const [draftBody, setDraftBody] = useState('');
  const [draftSessionId, setDraftSessionId] = useState<string | null>(null);
  const [matDraftDescription, setMatDraftDescription] = useState('');
  const [matDraftUnitCostCents, setMatDraftUnitCostCents] = useState(0);
  const [matDraftQuantity, setMatDraftQuantity] = useState(1);
  const [matDraftUnit, setMatDraftUnit] = useState('ea');
  const [chooseJobList, setChooseJobList] = useState<ChooseJobBottomSheetJob[]>([]);
  const [chooseJobLoading, setChooseJobLoading] = useState(false);
  const [chooseJobError, setChooseJobError] = useState<string | null>(null);

  const [homeLoading, setHomeLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [weeklyNetCents, setWeeklyNetCents] = useState(0);
  const [openTabJobsPage, setOpenTabJobsPage] = useState<ListJobsForCurrentUserItem[]>([]);
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

  const needsAttentionRows = useMemo(() => {
    const incomplete = openTabJobsPage
      .filter((j) => !j.isFinanciallyComplete)
      .map((j) => ({ kind: 'incomplete' as const, job: j }));
    const review = openTabJobsPage
      .filter(needsReviewMarkComplete)
      .map((j) => ({ kind: 'review' as const, job: j }));
    const payment = openTabJobsPage
      .filter(needsReviewPayment)
      .map((j) => ({ kind: 'payment' as const, job: j }));
    return [...incomplete, ...review, ...payment];
  }, [openTabJobsPage]);

  const runHomeFetch = useCallback(async (isCancelled: () => boolean) => {
    if (!isSupabaseConfigured()) {
      if (!isCancelled()) {
        setHomeError('Supabase is not configured.');
        setWeeklyNetCents(0);
        setOpenTabJobsPage([]);
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
        setOpenTabJobsPage(openPage.items);
        setRecentJobsDetail(recent);
      }
    } catch (err) {
      if (!isCancelled()) {
        setHomeError(err instanceof Error ? err.message : 'Failed to load home.');
        setWeeklyNetCents(0);
        setOpenTabJobsPage([]);
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

  const resetCapture = useCallback(() => {
    setCaptureStep('idle');
    setCaptureMode('inbox');
    setCaptureJob(null);
    setCaptureSessions([]);
    setDraftBody('');
    setDraftSessionId(null);
    setMatDraftDescription('');
    setMatDraftUnitCostCents(0);
    setMatDraftQuantity(1);
    setMatDraftUnit('ea');
    setCaptureSaving(false);
    setChooseJobList([]);
    setChooseJobError(null);
  }, []);

  const closeQuickActions = useCallback(() => {
    setQuickActionsVisible(false);
    resetCapture();
  }, [resetCapture]);

  const openQuickActions = useCallback(() => {
    resetCapture();
    setQaStep('quickCapture');
    setActionError(null);
    setQuickActionsVisible(true);
  }, [resetCapture]);

  /** Load a job's sessions so the job-scoped capture can offer the +SESSION pill. */
  const loadCaptureJobSessions = useCallback(async (jobId: string) => {
    if (!isSupabaseConfigured()) {
      setCaptureSessions([]);
      return;
    }
    try {
      const detail = await fetchJobDetail(supabase, jobId);
      const sessions = (detail?.allSessions ?? []).map((s) => ({
        id: s.id,
        dateLabel: s.dateLabel,
        timeRangeLabel: s.timeRangeLabel,
      }));
      setCaptureSessions(sessions);
    } catch {
      // Best-effort: without sessions the +SESSION pill simply stays hidden.
      setCaptureSessions([]);
    }
  }, []);

  const beginInboxCapture = useCallback((kind: QuickCaptureKind) => {
    setCaptureKind(kind);
    setCaptureMode('inbox');
    setCaptureJob(null);
    setCaptureSessions([]);
    setDraftSessionId(null);
    if (kind === 'note') {
      setDraftBody('');
      setCaptureStep('noteEdit');
    } else {
      setMatDraftDescription('');
      setMatDraftUnitCostCents(0);
      setMatDraftQuantity(1);
      setMatDraftUnit('ea');
      setCaptureStep('materialEdit');
    }
  }, []);

  const beginJobCapture = useCallback(
    (job: QuickActionsRecentJob, kind: QuickCaptureKind) => {
      setCaptureKind(kind);
      setCaptureMode('job');
      setCaptureJob({
        id: job.id,
        shortDescription: job.shortDescription,
        customerName: job.customerName,
      });
      setCaptureSessions([]);
      setDraftSessionId(null);
      void loadCaptureJobSessions(job.id);
      if (kind === 'note') {
        setDraftBody('');
        setCaptureStep('noteEdit');
      } else {
        setMatDraftDescription('');
        setMatDraftUnitCostCents(0);
        setMatDraftQuantity(1);
        setMatDraftUnit('ea');
        setCaptureStep('materialEdit');
      }
    },
    [loadCaptureJobSessions],
  );

  /** Inbox capture → "+JOB" pill: open the full job chooser. */
  const openChooseJob = useCallback(() => {
    setCaptureStep('chooseJob');
    setChooseJobError(null);
    setChooseJobLoading(true);
    void (async () => {
      if (!isSupabaseConfigured()) {
        setChooseJobError('Supabase is not configured.');
        setChooseJobLoading(false);
        return;
      }
      try {
        const page = await listJobsForCurrentUserPage(supabase, {
          limit: 100,
          offset: 0,
          tab: 'all',
        });
        setChooseJobList(
          page.items.map((j) => ({
            id: j.id,
            shortDescription: j.shortDescription,
            customerName: j.customerName,
          })),
        );
      } catch (err) {
        setChooseJobError(formatCaptureError(err) || 'Could not load jobs.');
      } finally {
        setChooseJobLoading(false);
      }
    })();
  }, []);

  /** Picking a job in the chooser converts the Inbox draft into a job capture. */
  const onChooseJobSelect = useCallback(
    (jobId: string) => {
      const job = chooseJobList.find((j) => j.id === jobId) ?? null;
      setCaptureMode('job');
      setCaptureJob(job);
      setDraftSessionId(null);
      setCaptureSessions([]);
      if (job) void loadCaptureJobSessions(job.id);
      setCaptureStep(captureKind === 'note' ? 'noteEdit' : 'materialEdit');
    },
    [captureKind, chooseJobList, loadCaptureJobSessions],
  );

  const returnToCaptureEdit = useCallback(() => {
    setCaptureStep(captureKind === 'note' ? 'noteEdit' : 'materialEdit');
  }, [captureKind]);

  const draftAssignedSession = useMemo(() => {
    if (!draftSessionId) return null;
    const s = captureSessions.find((x) => x.id === draftSessionId);
    return s ? { id: s.id, dateLabel: s.dateLabel, timeRangeLabel: s.timeRangeLabel } : null;
  }, [captureSessions, draftSessionId]);

  const saveCaptureNote = useCallback(
    async ({ body }: EditNoteBottomSheetValues) => {
      if (captureSaving) return;
      if (!isSupabaseConfigured()) {
        Alert.alert('Save failed', 'Supabase is not configured.');
        return;
      }
      setCaptureSaving(true);
      try {
        await createNote(supabase, {
          jobId: captureMode === 'job' && captureJob ? captureJob.id : null,
          sessionId: captureMode === 'job' ? draftSessionId : null,
          body,
        });
        closeQuickActions();
        invalidateJobsList();
      } catch (e) {
        Alert.alert('Save failed', formatCaptureError(e) || 'Could not save note.');
      } finally {
        setCaptureSaving(false);
      }
    },
    [captureJob, captureMode, captureSaving, closeQuickActions, draftSessionId, invalidateJobsList],
  );

  const saveCaptureMaterial = useCallback(
    async (values: EditMaterialBottomSheetValues) => {
      if (captureSaving) return;
      if (!isSupabaseConfigured()) {
        Alert.alert('Save failed', 'Supabase is not configured.');
        return;
      }
      setCaptureSaving(true);
      try {
        await createMaterial(supabase, {
          jobId: captureMode === 'job' && captureJob ? captureJob.id : null,
          sessionId: captureMode === 'job' ? draftSessionId : null,
          description: values.description,
          quantity: values.quantity,
          unit: values.unit,
          unitCostCents: values.unitCostCents,
        });
        closeQuickActions();
        invalidateJobsList();
      } catch (e) {
        Alert.alert('Save failed', formatCaptureError(e) || 'Could not save material.');
      } finally {
        setCaptureSaving(false);
      }
    },
    [captureJob, captureMode, captureSaving, closeQuickActions, draftSessionId, invalidateJobsList],
  );

  const headerTopPad = Math.max(insets.top - space('Spacing/12'), 0);
  /** Clear FAB (56px) from bottom of shell main + small gap; avoid stacking full nav-height padding in the inner scroll. */
  const HOME_FAB_DIAMETER = 56;
  const scrollBottomPad = fabBottomOffset(insets) + HOME_FAB_DIAMETER + space('Spacing/12');

  const needNeedsAttentionExpand = needsAttentionRows.length > NEEDS_ATTENTION_PREVIEW_MAX;
  const shownNeedsAttentionRows =
    !needNeedsAttentionExpand || needsAttentionExpanded
      ? needsAttentionRows
      : needsAttentionRows.slice(0, NEEDS_ATTENTION_PREVIEW_MAX);

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
            subtitle="Completed jobs worked in the past 7 days"
            tone="neutral"
            typography={typography}
          />
          <MetricSnapshotCard
            label="NET EARNINGS"
            value={formatWeeklyUsd(weeklyNetCents)}
            valueTone="success"
            typography={typography}
            onPress={onOpenEarnings}
          />

          {needsAttentionRows.length > 0 ? (
            <>
              <SectionHeader
                title="NEEDS ATTENTION"
                tone="accent"
                typography={typography}
                leadingIcon={<HomeNeedsAttentionIcon color={color('Brand/Accent')} />}
              />
              <View style={styles.needsAttentionBlock}>
                {shownNeedsAttentionRows.map(({ kind, job }) => (
                  <View key={`${kind}-${job.id}`} style={styles.needsAttentionRowWrap}>
                    {kind === 'incomplete' ? (
                      <IncompleteJobRowCard
                        title={job.shortDescription.trim() || 'Untitled Job'}
                        missingFields={missingFieldsLabelsForHome(job)}
                        typography={typography}
                        onPress={() => onOpenJobDetail(job.id)}
                      />
                    ) : kind === 'review' ? (
                      <WorkedNotMarkedCompleteRowCard
                        title={job.shortDescription.trim() || 'Untitled Job'}
                        typography={typography}
                        onPress={() => onOpenJobDetail(job.id)}
                      />
                    ) : (
                      <PendingPaymentRowCard
                        title={job.shortDescription.trim() || 'Untitled Job'}
                        typography={typography}
                        onPress={() => onOpenJobDetail(job.id)}
                      />
                    )}
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
                      {shownNeedsAttentionRows.length} of {needsAttentionRows.length} jobs
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
            onPress={openQuickActions}
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
        onRequestClose={closeQuickActions}
      >
        <View style={styles.modalHost}>
          <QuickActionsBottomSheet
            typography={typography}
            visible={quickActionsVisible && captureStep === 'idle'}
            step={qaStep}
            onStepChange={setQaStep}
            recentJobs={recentJobs}
            recentJobsLoading={recentJobsLoading}
            recentJobsError={recentJobsError}
            actionError={actionError}
            starting={starting}
            onClose={closeQuickActions}
            onSelectExistingJob={onSelectExistingJob}
            onStartNewSession={onStartNewSession}
            onSelectJobForCapture={beginJobCapture}
            onCreateQuickCapture={beginInboxCapture}
          />

          <EditNoteBottomSheet
            typography={typography}
            visible={captureStep === 'noteEdit'}
            title={captureMode === 'inbox' ? 'New Note' : 'Add Note'}
            primaryLabel={captureMode === 'inbox' ? 'SAVE NOTE TO INBOX' : 'SAVE NEW NOTE'}
            subtitle={captureMode === 'inbox' ? 'Unassigned quick capture note' : undefined}
            values={{ body: draftBody }}
            assignedSession={draftAssignedSession}
            canAttachSession={captureMode === 'job' && captureSessions.length > 0}
            registerInGlobalStack={false}
            onClose={closeQuickActions}
            onBack={() => setCaptureStep('idle')}
            onJobPillPress={
              captureMode === 'inbox'
                ? (values) => {
                    setDraftBody(values.body);
                    openChooseJob();
                  }
                : undefined
            }
            onSessionPillPress={
              captureMode === 'job'
                ? (values) => {
                    setDraftBody(values.body);
                    setCaptureStep('noteSession');
                  }
                : undefined
            }
            onSavePress={(values) => void saveCaptureNote(values)}
            onDeletePress={() => setCaptureStep('idle')}
          />

          <EditMaterialBottomSheet
            typography={typography}
            visible={captureStep === 'materialEdit'}
            title={captureMode === 'inbox' ? 'New Material' : 'Add Material'}
            primaryLabel={captureMode === 'inbox' ? 'SAVE MATERIAL TO INBOX' : 'SAVE NEW MATERIAL'}
            subtitle={captureMode === 'inbox' ? 'Unassigned quick capture material' : undefined}
            values={{
              description: matDraftDescription,
              unitCostCents: matDraftUnitCostCents,
              quantity: matDraftQuantity,
              unit: matDraftUnit,
            }}
            assignedSession={draftAssignedSession}
            canAttachSession={captureMode === 'job' && captureSessions.length > 0}
            registerInGlobalStack={false}
            onClose={closeQuickActions}
            onBack={() => setCaptureStep('idle')}
            onJobPillPress={
              captureMode === 'inbox'
                ? (values) => {
                    setMatDraftDescription(values.description);
                    setMatDraftUnitCostCents(values.unitCostCents);
                    setMatDraftQuantity(values.quantity);
                    setMatDraftUnit(values.unit);
                    openChooseJob();
                  }
                : undefined
            }
            onSessionPillPress={
              captureMode === 'job'
                ? (values) => {
                    setMatDraftDescription(values.description);
                    setMatDraftUnitCostCents(values.unitCostCents);
                    setMatDraftQuantity(values.quantity);
                    setMatDraftUnit(values.unit);
                    setCaptureStep('materialSession');
                  }
                : undefined
            }
            onUnitPress={(values) => {
              setMatDraftDescription(values.description);
              setMatDraftUnitCostCents(values.unitCostCents);
              setMatDraftQuantity(values.quantity);
              setMatDraftUnit(values.unit);
              setCaptureStep('materialUnit');
            }}
            onSavePress={(values) => void saveCaptureMaterial(values)}
            onDeletePress={() => setCaptureStep('idle')}
          />

          <ChooseJobBottomSheet
            typography={typography}
            visible={captureStep === 'chooseJob'}
            jobs={chooseJobList}
            loading={chooseJobLoading}
            error={chooseJobError}
            registerInGlobalStack={false}
            onClose={closeQuickActions}
            onBack={returnToCaptureEdit}
            onSelect={onChooseJobSelect}
          />

          <ChooseSessionBottomSheet
            typography={typography}
            visible={captureStep === 'noteSession'}
            mode={draftSessionId ? 'edit' : 'attach'}
            sessions={captureSessions}
            currentSessionId={draftSessionId}
            registerInGlobalStack={false}
            onClose={closeQuickActions}
            onBack={() => setCaptureStep('noteEdit')}
            onSelect={(sessionId) => {
              setDraftSessionId(sessionId);
              setCaptureStep('noteEdit');
            }}
            onRemove={() => {
              setDraftSessionId(null);
              setCaptureStep('noteEdit');
            }}
          />

          <ChooseSessionBottomSheet
            typography={typography}
            visible={captureStep === 'materialSession'}
            mode={draftSessionId ? 'edit' : 'attach'}
            sessions={captureSessions}
            currentSessionId={draftSessionId}
            registerInGlobalStack={false}
            onClose={closeQuickActions}
            onBack={() => setCaptureStep('materialEdit')}
            onSelect={(sessionId) => {
              setDraftSessionId(sessionId);
              setCaptureStep('materialEdit');
            }}
            onRemove={() => {
              setDraftSessionId(null);
              setCaptureStep('materialEdit');
            }}
          />

          <DropdownBottomSheet
            typography={typography}
            visible={captureStep === 'materialUnit'}
            options={CAPTURE_UNIT_OPTIONS}
            currentValue={matDraftUnit}
            allowCustom
            customPlaceholder="Custom"
            registerInGlobalStack={false}
            onClose={closeQuickActions}
            onBack={() => setCaptureStep('materialEdit')}
            onSelect={(unit) => {
              setMatDraftUnit(unit || 'ea');
              setCaptureStep('materialEdit');
            }}
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
