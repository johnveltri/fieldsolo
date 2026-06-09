import { useFonts } from 'expo-font';
import { PTSerif_700Bold } from '@expo-google-fonts/pt-serif';
import {
  UbuntuSansMono_400Regular,
  UbuntuSansMono_600SemiBold,
  UbuntuSansMono_700Bold,
} from '@expo-google-fonts/ubuntu-sans-mono';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getEarningsSnapshotForCurrentUser,
  getOutstandingPaymentsForCurrentUser,
  type EarningsSnapshotJob,
} from '@fieldbook/api-client';
import { color, radius } from '@fieldbook/design-system/lib/tokens';

import { CanvasTiledBackground } from '../components/CanvasTiledBackground';
import {
  EarningsSnapshotCard,
  OutstandingPaymentCard,
  RankedJobRowCard,
  SectionHeader,
} from '../components/ds';
import { useJobsListInvalidation } from '../context/JobsListInvalidationContext';
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

export type EarningsWindow = 'week' | 'month' | 'year';

type EarningsScreenProps = {
  /** Selected time window (controlled by the shell so Home can land on `week`). */
  window: EarningsWindow;
  onWindowChange: (next: EarningsWindow) => void;
  onOpenJobDetail: (jobId?: string) => void;
  /** Navigate to the Jobs screen, Open tab (unpaid section). */
  onOpenJobsOpenTab: () => void;
};

type WindowConfig = {
  tabLabel: string;
  windowDays: number;
  snapshotTitle: string;
  snapshotSubtitle: string;
};

const WINDOW_CONFIG: Record<EarningsWindow, WindowConfig> = {
  week: {
    tabLabel: 'PAST WEEK',
    windowDays: 7,
    snapshotTitle: 'WEEKLY SNAPSHOT',
    snapshotSubtitle: 'Completed jobs worked in the past 7 days',
  },
  month: {
    tabLabel: 'PAST MONTH',
    windowDays: 30,
    snapshotTitle: 'MONTHLY SNAPSHOT',
    snapshotSubtitle: 'Completed jobs worked in the past 30 days',
  },
  year: {
    tabLabel: 'PAST YEAR',
    windowDays: 365,
    snapshotTitle: 'ANNUAL SNAPSHOT',
    snapshotSubtitle: 'Completed jobs worked in the past 365 days',
  },
};

const WINDOW_ORDER: EarningsWindow[] = ['week', 'month', 'year'];

type Typography = ReturnType<typeof createTextStyles>;

type SnapshotState = {
  netEarningsCents: number;
  revenueCents: number;
  materialsCents: number;
  totalHours: number;
  jobCount: number;
  netPerHrCents: number | null;
  jobs: EarningsSnapshotJob[];
};

const EMPTY_SNAPSHOT: SnapshotState = {
  netEarningsCents: 0,
  revenueCents: 0,
  materialsCents: 0,
  totalHours: 0,
  jobCount: 0,
  netPerHrCents: null,
  jobs: [],
};

function formatUsd(cents: number, fractionDigits = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(cents / 100);
}

function formatNetPerHr(cents: number | null): string {
  if (cents == null) return '—';
  const dollars = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
    Math.round(cents / 100),
  );
  return `${cents < 0 ? '-' : ''}$${dollars.replace('-', '')}/hr`;
}

type RankedSection = {
  key: string;
  title: string;
  rows: { job: EarningsSnapshotJob; value: string }[];
};

export function EarningsScreen({
  window,
  onWindowChange,
  onOpenJobDetail,
  onOpenJobsOpenTab,
}: EarningsScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollY = useMemo(() => new Animated.Value(0), []);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);
  const { version } = useJobsListInvalidation();

  const [fontsLoaded] = useFonts({
    PTSerif_700Bold,
    UbuntuSansMono_400Regular,
    UbuntuSansMono_600SemiBold,
    UbuntuSansMono_700Bold,
  });

  const typography: Typography = useMemo(
    () =>
      createTextStyles({
        serifBold: 'PTSerif_700Bold',
        mono: 'UbuntuSansMono_400Regular',
        monoSemi: 'UbuntuSansMono_600SemiBold',
        monoBold: 'UbuntuSansMono_700Bold',
      }),
    [],
  );

  const [snapshot, setSnapshot] = useState<SnapshotState>(EMPTY_SNAPSHOT);
  const [outstanding, setOutstanding] = useState<{ count: number; revenueCents: number }>({
    count: 0,
    revenueCents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const config = WINDOW_CONFIG[window];

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError(null);
    if (!isSupabaseConfigured()) {
      setLoading(false);
      setLoadError('Supabase is not configured.');
      setSnapshot(EMPTY_SNAPSHOT);
      setOutstanding({ count: 0, revenueCents: 0 });
      return;
    }
    void (async () => {
      try {
        const [snap, owed] = await Promise.all([
          getEarningsSnapshotForCurrentUser(supabase, { windowDays: config.windowDays }),
          getOutstandingPaymentsForCurrentUser(supabase),
        ]);
        if (!alive) return;
        setSnapshot({
          netEarningsCents: snap.aggregate.netEarningsCents,
          revenueCents: snap.aggregate.revenueCents,
          materialsCents: snap.aggregate.materialsCents,
          totalHours: snap.aggregate.totalHours,
          jobCount: snap.aggregate.jobCount,
          netPerHrCents: snap.aggregate.netPerHrCents,
          jobs: snap.jobs,
        });
        setOutstanding({ count: owed.count, revenueCents: owed.revenueCents });
      } catch (err) {
        if (!alive) return;
        setLoadError(err instanceof Error ? err.message : 'Failed to load earnings.');
        setSnapshot(EMPTY_SNAPSHOT);
        setOutstanding({ count: 0, revenueCents: 0 });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [config.windowDays, version]);

  const rankedSections = useMemo<RankedSection[]>(() => {
    const jobs = snapshot.jobs;
    const byNetDesc = [...jobs].sort((a, b) => b.netEarningsCents - a.netEarningsCents).slice(0, 3);
    const byNetAsc = [...jobs].sort((a, b) => a.netEarningsCents - b.netEarningsCents).slice(0, 3);
    const hourly = jobs.filter((j) => j.netPerHrCents != null);
    const byHrDesc = [...hourly]
      .sort((a, b) => (b.netPerHrCents ?? 0) - (a.netPerHrCents ?? 0))
      .slice(0, 3);
    const byHrAsc = [...hourly]
      .sort((a, b) => (a.netPerHrCents ?? 0) - (b.netPerHrCents ?? 0))
      .slice(0, 3);

    const earningsRows = (list: EarningsSnapshotJob[]) =>
      list.map((job) => ({ job, value: formatUsd(job.netEarningsCents, 0) }));
    const profitRows = (list: EarningsSnapshotJob[]) =>
      list.map((job) => ({ job, value: formatNetPerHr(job.netPerHrCents) }));

    return [
      { key: 'highest', title: 'HIGHEST EARNINGS (NET)', rows: earningsRows(byNetDesc) },
      { key: 'lowest', title: 'LOWEST EARNINGS (NET)', rows: earningsRows(byNetAsc) },
      { key: 'most', title: 'MOST PROFITABLE (NET/HR)', rows: profitRows(byHrDesc) },
      { key: 'least', title: 'LEAST PROFITABLE (NET/HR)', rows: profitRows(byHrAsc) },
    ];
  }, [snapshot.jobs]);

  const headerTopPad = Math.max(insets.top - space('Spacing/12'), 0);
  const bottomNavReservedHeight =
    space('Spacing/8') + 1 + 64 + space('Spacing/8') + insets.bottom;

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
            paddingBottom: bottomNavReservedHeight + space('Spacing/20'),
            flexGrow: 1,
          },
        ]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        onContentSizeChange={(_w, h) => setScrollContentHeight(h)}
      >
        <View style={styles.headerBand}>
          <View style={[styles.titleOnlyRow, { maxWidth: TOP_HEADER_MAX_WIDTH }]}>
            <Text style={typography.displayH1}>EARNINGS</Text>
          </View>
        </View>

        <View style={styles.bandCentered}>
          <View style={[styles.tabsWrap, { maxWidth: CONTENT_MAX_WIDTH }]}>
            {WINDOW_ORDER.map((w) => {
              const selected = w === window;
              return (
                <Pressable
                  key={w}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => onWindowChange(w)}
                  style={({ pressed }) => [
                    selected ? styles.tabActive : styles.tabIdle,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      typography.statusPillLabel,
                      styles.tabLabel,
                      { color: selected ? fg.primary : fg.secondary },
                    ]}
                  >
                    {WINDOW_CONFIG[w].tabLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={color('Brand/Primary')} />
            <Text style={[typography.body, { color: fg.secondary, marginTop: space('Spacing/12') }]}>
              Loading earnings…
            </Text>
          </View>
        ) : loadError ? (
          <View style={styles.centerState}>
            <Text style={[typography.body, { color: fg.secondary, textAlign: 'center' }]}>
              {loadError}
            </Text>
          </View>
        ) : (
          <>
            <SectionHeader
              title={config.snapshotTitle}
              subtitle={config.snapshotSubtitle}
              tone="neutral"
              typography={typography}
            />
            <View style={styles.cardBand}>
              <EarningsSnapshotCard
                netEarnings={formatUsd(snapshot.netEarningsCents)}
                revenue={formatUsd(snapshot.revenueCents)}
                materials={formatUsd(snapshot.materialsCents)}
                time={`${snapshot.totalHours.toFixed(1)}h`}
                netPerHr={formatNetPerHr(snapshot.netPerHrCents)}
                jobs={String(snapshot.jobCount)}
                typography={typography}
              />
            </View>

            <View style={[styles.cardBand, styles.cardBandTopGap]}>
              <OutstandingPaymentCard
                count={outstanding.count}
                amount={formatUsd(outstanding.revenueCents)}
                typography={typography}
                onPress={onOpenJobsOpenTab}
              />
            </View>

            {rankedSections.map((section) => (
              <View key={section.key} style={styles.sectionGroup}>
                <SectionHeader title={section.title} tone="accent" typography={typography} />
                {section.rows.length === 0 ? (
                  <View style={styles.cardBand}>
                    <Text style={[typography.body, { color: fg.secondary }]}>
                      No jobs in this period.
                    </Text>
                  </View>
                ) : (
                  section.rows.map(({ job, value }, index) => (
                    <View key={job.id} style={styles.cardBand}>
                      <RankedJobRowCard
                        rank={index + 1}
                        title={job.shortDescription || 'Untitled Job'}
                        subtitle={job.customerName}
                        value={value}
                        typography={typography}
                        onPress={() => onOpenJobDetail(job.id)}
                      />
                    </View>
                  ))
                )}
              </View>
            ))}
          </>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', backgroundColor: bg.canvasWarm },
  scroll: { flex: 1, width: '100%', backgroundColor: 'transparent', zIndex: 1 },
  scrollContent: {
    alignItems: 'center',
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
  titleOnlyRow: {
    width: '100%',
    paddingHorizontal: space('Spacing/20'),
    paddingTop: space('Spacing/32'),
    paddingBottom: space('Spacing/16'),
    minHeight: 48,
    justifyContent: 'center',
  },
  bandCentered: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: space('Spacing/20'),
  },
  tabsWrap: {
    width: '100%',
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
  cardBand: {
    width: '100%',
    maxWidth: TOP_HEADER_MAX_WIDTH,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: space('Spacing/20'),
    marginBottom: space('Spacing/12'),
  },
  cardBandTopGap: {
    marginTop: space('Spacing/4'),
  },
  sectionGroup: {
    width: '100%',
    alignItems: 'center',
  },
  centerState: {
    width: '100%',
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space('Spacing/20'),
  },
  pressed: { opacity: 0.75 },
});
