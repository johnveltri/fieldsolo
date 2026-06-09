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
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  countInboxItems,
  createBlankJobForCurrentUser,
  listJobsForCurrentUserPage,
  type ListJobsForCurrentUserItem,
  type ListJobsForCurrentUserTab,
} from '@fieldbook/api-client';
import { color, colorWithAlpha, radius } from '@fieldbook/design-system/lib/tokens';

import { CanvasTiledBackground } from '../components/CanvasTiledBackground';
import {
  JobsFabPlusIcon,
  JobsInboxIcon,
  JobsSearchClearIcon,
  JobsSearchIcon,
} from '../components/figma-icons/JobsScreenIcons';
import {
  JobCard,
  JobsOpenStackSectionHeader,
  type JobsOpenSectionKind,
} from '../components/ds';
import { shellBottomNavOuterHeight } from '../components/shell/ShellBottomNav';
import { useJobsListInvalidation } from '../context/JobsListInvalidationContext';
import { analytics, errorProperties } from '../lib/analytics';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  recencyBucket,
  RECENCY_BUCKET_TITLE,
  type RecencyBucket,
} from '../lib/timeBuckets';
import {
  CONTENT_MAX_WIDTH,
  TOP_HEADER_MAX_WIDTH,
  bg,
  border,
  cardShadowRn,
  createTextStyles,
  fg,
  space,
} from '../theme/nativeTokens';

const PAGE_SIZE = 20;

type JobsScreenProps = {
  onOpenJobDetail: (jobId?: string, options?: { initialEditOpen?: boolean }) => void;
  /** Open the Inbox of unassigned quick captures (header icon). */
  onOpenInbox?: () => void;
  /**
   * Hide the "New Job" floating action button. Used while a Live Session is
   * in progress — the floating MinimizedLiveSessionBar takes its slot.
   */
  suppressFab?: boolean;
  /**
   * When both are set, the All / Open / Paid tab is controlled by the parent so it
   * survives navigation (e.g. Job Detail unmounts this screen).
   */
  jobsListTab?: ListJobsForCurrentUserTab;
  onJobsListTabChange?: (tab: ListJobsForCurrentUserTab) => void;
};

type Typography = ReturnType<typeof createTextStyles>;

function isJobIncomplete(job: ListJobsForCurrentUserItem): boolean {
  return !job.isFinanciallyComplete;
}

function incompletePillsFor(job: ListJobsForCurrentUserItem): string[] {
  const pills: string[] = [];
  const desc = job.shortDescription.trim();
  if (desc === '' || desc === 'Untitled Job') pills.push('NO SHORT DESCRIPTION');
  if (job.revenueCents == null || job.revenueCents === 0) pills.push('NO REVENUE');
  if (!job.hasMaterials && !job.noMaterialsConfirmed) pills.push('NO MATERIALS');
  if (!job.hasSessions) pills.push('NO SESSIONS');
  return pills;
}

type JobsFlatRow =
  | { kind: 'section'; key: string; mode: 'recency'; title: string }
  | {
      kind: 'section';
      key: string;
      mode: 'openStack';
      openKind: JobsOpenSectionKind;
      count: number;
    }
  | { kind: 'job'; job: ListJobsForCurrentUserItem; key: string; incompletePills?: string[] };

function buildFlatRows(jobs: ListJobsForCurrentUserItem[]): JobsFlatRow[] {
  const nowMs = Date.now();
  let prev: RecencyBucket | null = null;
  const rows: JobsFlatRow[] = [];
  for (const job of jobs) {
    const b = recencyBucket(job.lastWorkedAt, job.createdAt, nowMs);
    if (b !== prev) {
      rows.push({
        kind: 'section',
        mode: 'recency',
        title: RECENCY_BUCKET_TITLE[b],
        key: `h-${b}-${rows.length}`,
      });
      prev = b;
    }
    rows.push({ kind: 'job', job, key: job.id });
  }
  return rows;
}

function buildOpenFlatRows(jobs: ListJobsForCurrentUserItem[]): JobsFlatRow[] {
  const incomplete: ListJobsForCurrentUserItem[] = [];
  const inProgress: ListJobsForCurrentUserItem[] = [];
  const unpaid: ListJobsForCurrentUserItem[] = [];
  for (const job of jobs) {
    if (isJobIncomplete(job)) incomplete.push(job);
    else if (job.workStatus === 'inProgress') inProgress.push(job);
    else if (job.workStatus === 'completed') unpaid.push(job);
  }

  const rows: JobsFlatRow[] = [];
  const pushOpenSection = (
    openKind: JobsOpenSectionKind,
    sectionJobs: ListJobsForCurrentUserItem[],
    withPills: boolean,
  ) => {
    if (sectionJobs.length === 0) return;
    rows.push({
      kind: 'section',
      mode: 'openStack',
      openKind,
      count: sectionJobs.length,
      key: `h-open-${openKind}-${rows.length}`,
    });
    for (const job of sectionJobs) {
      rows.push({
        kind: 'job',
        job,
        key: job.id,
        incompletePills: withPills ? incompletePillsFor(job) : undefined,
      });
    }
  };

  pushOpenSection('incomplete', incomplete, true);
  pushOpenSection('inProgress', inProgress, false);
  pushOpenSection('unpaid', unpaid, false);
  return rows;
}

function JobsLoadingSkeleton({ typography }: { typography: Typography }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.skeletonWrap} accessibilityLabel="Loading jobs">
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.skeletonRow,
            {
              opacity: pulse,
            },
          ]}
        />
      ))}
      <ActivityIndicator color={color('Brand/Primary')} style={{ marginTop: space('Spacing/24') }} />
      <Text style={[typography.body, { color: fg.secondary, marginTop: space('Spacing/12') }]}>
        Loading jobs…
      </Text>
    </View>
  );
}

export function JobsScreen({
  onOpenJobDetail,
  onOpenInbox,
  suppressFab = false,
  jobsListTab: jobsListTabProp,
  onJobsListTabChange,
}: JobsScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollY = useMemo(() => new Animated.Value(0), []);
  const { version } = useJobsListInvalidation();
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

  const [jobs, setJobs] = useState<ListJobsForCurrentUserItem[]>([]);
  const jobsRef = useRef(jobs);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  // Live count of unassigned quick captures for the header Inbox badge.
  // Refetched whenever the jobs list is invalidated (e.g. after a capture or
  // an assign-to-job), so the badge stays in sync without its own channel.
  const [inboxCount, setInboxCount] = useState(0);
  useEffect(() => {
    let alive = true;
    void (async () => {
      if (!isSupabaseConfigured()) return;
      try {
        const counts = await countInboxItems(supabase);
        if (alive) setInboxCount(counts.total);
      } catch {
        // Best-effort badge; leave the prior count on failure.
      }
    })();
    return () => {
      alive = false;
    };
  }, [version]);

  const [internalJobsTab, setInternalJobsTab] = useState<ListJobsForCurrentUserTab>('all');
  const jobsTabControlled =
    jobsListTabProp !== undefined && onJobsListTabChange !== undefined;
  const activeTab = jobsTabControlled ? jobsListTabProp : internalJobsTab;
  const setActiveTab = useCallback(
    (t: ListJobsForCurrentUserTab) => {
      if (t !== activeTab) {
        analytics.capture('jobs_tab_changed', {
          from_tab: activeTab,
          to_tab: t,
          current_count: jobsRef.current.length,
        });
      }
      if (jobsTabControlled) onJobsListTabChange(t);
      else setInternalJobsTab(t);
    },
    [activeTab, jobsTabControlled, onJobsListTabChange],
  );
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreInFlight = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creatingJob, setCreatingJob] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const firstPageRequestIdRef = useRef(0);
  const [listContentHeight, setListContentHeight] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const formatLoadError = useCallback((error: unknown): string => {
    return error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : 'Failed to load jobs.';
  }, []);

  const loadFirstPage = useCallback(async () => {
    const startedAt = Date.now();
    const requestId = firstPageRequestIdRef.current + 1;
    firstPageRequestIdRef.current = requestId;
    if (!isSupabaseConfigured()) {
      setLoading(false);
      setJobs([]);
      setHasMore(false);
      setLoadError('Supabase is not configured.');
      analytics.capture('supabase_not_configured_seen', {
        screen: 'jobs',
        operation: 'jobs_list_loaded',
      });
      return;
    }
    if (searchFocused && debouncedSearch.trim() === '') {
      setLoading(false);
      setJobs([]);
      setHasMore(false);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    setHasMore(true);
    try {
      const { items, hasMore: more } = await listJobsForCurrentUserPage(supabase, {
        limit: PAGE_SIZE,
        offset: 0,
        tab: activeTab,
        search: debouncedSearch.trim() || undefined,
      });
      if (firstPageRequestIdRef.current !== requestId) return;
      setJobs(items);
      setHasMore(more);
      analytics.capture('jobs_list_loaded', {
        tab: activeTab,
        search_present: debouncedSearch.trim().length > 0,
        search_length: debouncedSearch.trim().length,
        item_count: items.length,
        has_more: more,
        load_duration_ms: Date.now() - startedAt,
        inbox_count: inboxCount,
      });
      if (searchFocused && debouncedSearch.trim().length > 0) {
        analytics.capture('jobs_search_submitted', {
          query_length: debouncedSearch.trim().length,
          result_count: items.length,
          tab: activeTab,
        });
      }
    } catch (error) {
      if (firstPageRequestIdRef.current !== requestId) return;
      setJobs([]);
      setHasMore(false);
      setLoadError(formatLoadError(error));
      analytics.capture('jobs_list_load_failed', {
        tab: activeTab,
        search_present: debouncedSearch.trim().length > 0,
        search_length: debouncedSearch.trim().length,
        load_duration_ms: Date.now() - startedAt,
        ...errorProperties(error),
      });
    } finally {
      if (firstPageRequestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [activeTab, debouncedSearch, formatLoadError, inboxCount, searchFocused]);

  useEffect(() => {
    void loadFirstPage();
  }, [version, loadFirstPage]);

  const loadNextPage = useCallback(async () => {
    if (!isSupabaseConfigured() || loadMoreInFlight.current || loading || !hasMore) return;
    if (searchFocused && debouncedSearch.trim() === '') return;
    const requestId = firstPageRequestIdRef.current;
    loadMoreInFlight.current = true;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const offset = jobsRef.current.length;
      const { items, hasMore: more } = await listJobsForCurrentUserPage(supabase, {
        limit: PAGE_SIZE,
        offset,
        tab: activeTab,
        search: debouncedSearch.trim() || undefined,
      });
      if (firstPageRequestIdRef.current !== requestId) return;
      setJobs((prev) => {
        const seen = new Set(prev.map((j) => j.id));
        const next = [...prev];
        for (const j of items) {
          if (!seen.has(j.id)) next.push(j);
        }
        return next;
      });
      setHasMore(more);
      analytics.capture('jobs_pagination_loaded', {
        tab: activeTab,
        offset,
        added_count: items.length,
        has_more: more,
        search_present: debouncedSearch.trim().length > 0,
      });
    } catch (error) {
      if (firstPageRequestIdRef.current !== requestId) return;
      setLoadError(formatLoadError(error));
      analytics.capture('jobs_pagination_failed', {
        tab: activeTab,
        offset: jobsRef.current.length,
        search_present: debouncedSearch.trim().length > 0,
        ...errorProperties(error),
      });
    } finally {
      loadMoreInFlight.current = false;
      if (firstPageRequestIdRef.current === requestId) {
        setLoadingMore(false);
      }
    }
  }, [activeTab, debouncedSearch, formatLoadError, hasMore, loading, searchFocused]);

  const onSearchFocus = useCallback(() => {
    analytics.capture('jobs_search_started', { source: 'jobs' });
    setSearchFocused(true);
    setDebouncedSearch(searchQuery);
  }, [searchQuery]);

  const exitSearch = useCallback(() => {
    if (searchQuery.trim().length > 0) {
      analytics.capture('jobs_search_cleared', {
        query_length: searchQuery.trim().length,
        result_count: jobsRef.current.length,
      });
    }
    searchInputRef.current?.blur();
    setSearchFocused(false);
    setSearchQuery('');
    setDebouncedSearch('');
  }, []);

  const onSearchBlur = useCallback(() => {
    exitSearch();
  }, [exitSearch]);

  const onEndReached = useCallback(() => {
    void loadNextPage();
  }, [loadNextPage]);

  const flatData = useMemo(
    () => (activeTab === 'open' ? buildOpenFlatRows(jobs) : buildFlatRows(jobs)),
    [activeTab, jobs],
  );

  const onCreateJob = useCallback(async () => {
    if (creatingJob) return;
    if (!isSupabaseConfigured()) {
      setLoadError('Supabase is not configured.');
      analytics.capture('supabase_not_configured_seen', {
        screen: 'jobs',
        operation: 'job_create_started',
      });
      return;
    }
    setCreatingJob(true);
    setLoadError(null);
    analytics.capture('job_create_started', { source: 'jobs_fab' });
    try {
      const jobId = await createBlankJobForCurrentUser(supabase);
      analytics.capture('job_created', {
        source: 'jobs_fab',
        job_id: jobId,
        placeholder: true,
      });
      onOpenJobDetail(jobId, { initialEditOpen: true });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'object' &&
              error !== null &&
              'message' in error &&
              typeof (error as { message: unknown }).message === 'string'
            ? (error as { message: string }).message
            : 'Failed to create job.';
      setLoadError(message);
      analytics.capture('job_create_failed', {
        source: 'jobs_fab',
        ...errorProperties(error),
      });
    } finally {
      setCreatingJob(false);
    }
  }, [creatingJob, onOpenJobDetail]);

  const renderItem = useCallback<ListRenderItem<JobsFlatRow>>(
    ({ item }) => {
      if (item.kind === 'section') {
        if (item.mode === 'recency') {
          return (
            <View style={styles.listRowBand}>
              <View style={[styles.sectionHeader, styles.listRowInner, { maxWidth: TOP_HEADER_MAX_WIDTH }]}>
                <Text style={typography.metricS}>{item.title}</Text>
              </View>
            </View>
          );
        }
        return (
          <View style={styles.listRowBand}>
            <View style={[styles.listRowInner, { maxWidth: TOP_HEADER_MAX_WIDTH }]}>
              <JobsOpenStackSectionHeader
                kind={item.openKind}
                count={item.count}
                typography={typography}
              />
            </View>
          </View>
        );
      }
      return (
        <View style={styles.listRowBand}>
          <View style={[styles.jobRowWrap, styles.listRowInner, { maxWidth: TOP_HEADER_MAX_WIDTH }]}>
            <JobCard
              job={item.job}
              onPress={() => onOpenJobDetail(item.job.id)}
              typography={typography}
              incompletePills={item.incompletePills}
            />
          </View>
        </View>
      );
    },
    [onOpenJobDetail, typography],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeaderBand}>
        <View style={[styles.topHeader, { maxWidth: TOP_HEADER_MAX_WIDTH }]}>
          <Text style={typography.displayH1}>JOBS</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Inbox${inboxCount > 0 ? `, ${inboxCount} unassigned` : ''}`}
            onPress={onOpenInbox}
            hitSlop={12}
            style={({ pressed }) => [styles.inboxWrap, pressed && styles.pressed]}
          >
            <JobsInboxIcon color={fg.primary} />
            {inboxCount > 0 ? (
              <View style={styles.inboxBadge}>
                <Text style={[typography.bodySmall, { color: bg.canvasWarm }]}>
                  {inboxCount > 99 ? '99+' : inboxCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={[styles.searchBarOuter, { maxWidth: CONTENT_MAX_WIDTH }]}>
          <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
            <View style={styles.searchIconSlot} pointerEvents="none">
              <JobsSearchIcon color={fg.secondary} />
            </View>
            <TextInput
              ref={searchInputRef}
              testID="jobs-search-input"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={onSearchFocus}
              onBlur={onSearchBlur}
              placeholder="Search by job or customer"
              placeholderTextColor={fg.secondary}
              style={[typography.body, styles.searchInput]}
              selectionColor={color('Brand/Primary')}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchFocused ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close search"
                onPress={exitSearch}
                hitSlop={12}
                style={({ pressed }) => [styles.searchClearButton, pressed && styles.pressed]}
              >
                <JobsSearchClearIcon color={fg.primary} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {searchFocused && debouncedSearch.trim() === '' ? (
          <View style={[styles.searchEmptyPanel, { maxWidth: CONTENT_MAX_WIDTH }]}>
            <View style={styles.searchEmptyInner}>
              <View style={styles.searchEmptyIconWrap}>
                <JobsSearchIcon color={fg.secondary} size={32} />
              </View>
              <Text style={[typography.bodyBold, { color: fg.secondary, textAlign: 'center' }]}>
                Start typing to search jobs
              </Text>
            </View>
          </View>
        ) : null}

        {searchFocused ? null : (
          <View style={[styles.tabsWrap, { maxWidth: CONTENT_MAX_WIDTH }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === 'all' }}
              onPress={() => setActiveTab('all')}
              style={({ pressed }) => [
                activeTab === 'all' ? styles.tabActive : styles.tabIdle,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  typography.statusPillLabel,
                  styles.jobsTabLabel,
                  { color: activeTab === 'all' ? fg.primary : fg.secondary },
                ]}
              >
                All
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === 'open' }}
              onPress={() => setActiveTab('open')}
              style={({ pressed }) => [
                activeTab === 'open' ? styles.tabActive : styles.tabIdle,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  typography.statusPillLabel,
                  styles.jobsTabLabel,
                  { color: activeTab === 'open' ? fg.primary : fg.secondary },
                ]}
              >
                Open
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === 'paid' }}
              onPress={() => setActiveTab('paid')}
              style={({ pressed }) => [
                activeTab === 'paid' ? styles.tabActive : styles.tabIdle,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  typography.statusPillLabel,
                  styles.jobsTabLabel,
                  { color: activeTab === 'paid' ? fg.primary : fg.secondary },
                ]}
              >
                Paid
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    ),
    [
      activeTab,
      debouncedSearch,
      exitSearch,
      inboxCount,
      onOpenInbox,
      onSearchBlur,
      onSearchFocus,
      searchFocused,
      searchQuery,
      typography,
    ],
  );

  const listEmpty = useMemo(() => {
    if (loading) {
      return <JobsLoadingSkeleton typography={typography} />;
    }
    if (loadError) {
      return (
        <View style={styles.centerState}>
          <Text style={[typography.body, { color: fg.secondary, textAlign: 'center' }]}>
            {loadError}
          </Text>
        </View>
      );
    }
    if (searchFocused && debouncedSearch.trim() === '') {
      return null;
    }
    if (searchFocused && debouncedSearch.trim() !== '' && jobs.length === 0) {
      return (
        <View style={styles.centerState}>
          <Text style={[typography.body, { color: fg.secondary, textAlign: 'center' }]}>
            No matching jobs.
          </Text>
        </View>
      );
    }
    if (activeTab === 'open' && jobs.length === 0) {
      return (
        <View style={styles.centerState}>
          <Text style={[typography.body, { color: fg.secondary, textAlign: 'center' }]}>
            All caught up! No open jobs.
          </Text>
        </View>
      );
    }
    if (activeTab === 'paid' && jobs.length === 0) {
      return (
        <View style={styles.centerState}>
          <Text style={[typography.body, { color: fg.secondary, textAlign: 'center' }]}>
            No paid jobs yet.
          </Text>
        </View>
      );
    }
    if (activeTab === 'open' && jobs.length > 0 && flatData.length === 0) {
      return (
        <View style={styles.centerState}>
          <Text style={[typography.body, { color: fg.secondary, textAlign: 'center' }]}>
            No jobs in Incomplete, In Progress, or Unpaid right now.
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.centerState}>
        <Text style={[typography.body, { color: fg.secondary }]}>No jobs yet.</Text>
      </View>
    );
  }, [
    activeTab,
    debouncedSearch,
    flatData.length,
    jobs.length,
    loadError,
    loading,
    searchFocused,
    typography,
  ]);

  const listFooter = useMemo(() => {
    const showSpinner = loadingMore;
    const showPageError = loadError != null && jobs.length > 0;
    if (!showSpinner && !showPageError) return null;
    return (
      <View style={[styles.listFooter, styles.listRowBand]}>
        {showPageError ? (
          <Text style={[typography.body, { color: fg.secondary, textAlign: 'center', marginBottom: space('Spacing/12') }]}>
            {loadError}
          </Text>
        ) : null}
        {showSpinner ? <ActivityIndicator color={color('Brand/Primary')} /> : null}
      </View>
    );
  }, [jobs.length, loadError, loadingMore, typography]);

  if (!fontsLoaded) {
    return (
      <View style={styles.root}>
        <CanvasTiledBackground scrollY={scrollY} contentHeight={listContentHeight} />
      </View>
    );
  }

  const bottomNavReservedHeight =
    space('Spacing/8') + 1 + 64 + space('Spacing/8') + insets.bottom;
  const headerTopPad = Math.max(insets.top - space('Spacing/12'), 0);
  const fabBottomOffset =
    space('Spacing/8') +
    insets.bottom +
    64 +
    space('Spacing/12') -
    shellBottomNavOuterHeight(insets.bottom);

  return (
    <View style={styles.root}>
      <CanvasTiledBackground scrollY={scrollY} contentHeight={listContentHeight} />
      <View
        pointerEvents="none"
        style={[
          styles.safeAreaTopAccentWrap,
          { top: 0, maxWidth: TOP_HEADER_MAX_WIDTH },
        ]}
      >
        <View style={styles.topAccent} />
      </View>
      <Animated.FlatList
        data={loading ? [] : flatData}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        style={[styles.scroll, { paddingTop: headerTopPad }]}
        contentContainerStyle={[
          styles.flatListContent,
          {
            paddingBottom: suppressFab
              ? bottomNavReservedHeight + space('Spacing/20')
              : fabBottomOffset + 56 + space('Spacing/12'),
            flexGrow: 1,
          },
        ]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        onContentSizeChange={(_w, h) => setListContentHeight(h)}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.35}
        keyboardShouldPersistTaps="handled"
      />

      {suppressFab ? null : (
        <View
          style={[
            styles.fabWrap,
            { bottom: fabBottomOffset },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create new job"
            disabled={creatingJob}
            onPress={onCreateJob}
            style={({ pressed }) => [styles.fabContent, (pressed || creatingJob) && styles.pressed]}
          >
            <JobsFabPlusIcon color={bg.canvasWarm} />
            <Text style={[typography.bodyBold, { color: bg.canvasWarm }]}>New Job</Text>
          </Pressable>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * Match lined canvas fill (`CanvasTiledBackground`) so overscroll (rubber-band)
   * does not flash the window default. Lines still do not draw in the bounce
   * inset — only this solid `canvasWarm` shows there.
   */
  root: { flex: 1, alignItems: 'center', backgroundColor: bg.canvasWarm },
  scroll: { flex: 1, width: '100%', backgroundColor: 'transparent', zIndex: 1 },
  flatListContent: {
    // `center` collapses row width to min-content and breaks job cards; stretch
    // full width, then center capped blocks via `listRowBand` / `listHeaderBand`.
    alignItems: 'stretch',
  },
  listHeaderBand: {
    width: '100%',
    alignItems: 'center',
  },
  listRowBand: {
    width: '100%',
    alignItems: 'center',
  },
  listRowInner: {
    width: '100%',
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
  topHeader: {
    width: '100%',
    paddingHorizontal: space('Spacing/20'),
    paddingTop: space('Spacing/32'),
    paddingBottom: space('Spacing/16'),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inboxWrap: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  inboxBadge: {
    position: 'absolute',
    top: 2,
    right: 1,
    minWidth: 16,
    height: 16,
    borderRadius: radius('Radius/Full'),
    backgroundColor: color('Brand/Primary'),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  searchBarOuter: {
    width: '100%',
  },
  searchBar: {
    position: 'relative',
    width: '100%',
    minHeight: 48,
    backgroundColor: bg.surfaceWhite,
    // Keep borderWidth constant so the white input area does not shrink on focus.
    borderWidth: 2,
    borderColor: border.subtle,
    borderRadius: 12,
    ...cardShadowRn,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: space('Spacing/12'),
  },
  searchBarFocused: {
    borderColor: color('Brand/PrimaryStroke'),
  },
  searchIconSlot: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 44,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    paddingRight: space('Spacing/8'),
    color: fg.primary,
    minHeight: 48,
  },
  searchClearButton: {
    padding: 5,
    borderRadius: radius('Radius/Full'),
    backgroundColor: colorWithAlpha('Foundation/Text/Primary', 0.1),
  },
  searchEmptyPanel: {
    width: '100%',
    marginTop: space('Spacing/12'),
    backgroundColor: bg.surfaceWhite,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 16,
    ...cardShadowRn,
    paddingVertical: space('Spacing/16'),
    paddingHorizontal: space('Spacing/20'),
  },
  searchEmptyInner: {
    alignItems: 'center',
    paddingVertical: space('Spacing/12'),
    paddingHorizontal: space('Spacing/12'),
  },
  searchEmptyIconWrap: {
    marginBottom: space('Spacing/8'),
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
  jobsTabLabel: {
    textTransform: 'uppercase',
  },
  sectionHeader: {
    width: '100%',
    paddingHorizontal: space('Spacing/20'),
    paddingTop: space('Spacing/36'),
    paddingBottom: space('Spacing/16'),
  },
  jobRowWrap: {
    width: '100%',
    paddingHorizontal: space('Spacing/20'),
    marginBottom: space('Spacing/12'),
  },
  listFooter: {
    paddingVertical: space('Spacing/20'),
    alignItems: 'center',
    width: '100%',
  },
  skeletonWrap: {
    width: '100%',
    maxWidth: TOP_HEADER_MAX_WIDTH,
    paddingHorizontal: space('Spacing/20'),
    paddingTop: space('Spacing/24'),
    alignItems: 'center',
    minHeight: 220,
  },
  skeletonRow: {
    width: '100%',
    height: 72,
    borderRadius: 16,
    backgroundColor: bg.subtle,
    marginBottom: space('Spacing/12'),
    borderWidth: 1,
    borderColor: border.subtle,
  },
  centerState: {
    width: '100%',
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space('Spacing/20'),
  },
  pressed: { opacity: 0.75 },
  fabWrap: {
    position: 'absolute',
    right: space('Spacing/24'),
    zIndex: 20,
  },
  fabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/8'),
    height: 56,
    borderRadius: radius('Radius/Full'),
    backgroundColor: color('Brand/Primary'),
    paddingHorizontal: 21,
    ...cardShadowRn,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
