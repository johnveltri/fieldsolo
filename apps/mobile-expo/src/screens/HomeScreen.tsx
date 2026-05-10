import { useFonts } from 'expo-font';
import { PTSerif_700Bold } from '@expo-google-fonts/pt-serif';
import {
  UbuntuSansMono_400Regular,
  UbuntuSansMono_600SemiBold,
  UbuntuSansMono_700Bold,
} from '@expo-google-fonts/ubuntu-sans-mono';
import {
  createBlankJobForLiveSessionStart,
  listRecentJobsForCurrentUser,
  tryBumpJobToInProgressIfNotStarted,
  type RecentJobItem,
} from '@fieldbook/api-client';
import { color, radius } from '@fieldbook/design-system/lib/tokens';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CanvasTiledBackground } from '../components/CanvasTiledBackground';
import { QuickActionsBottomSheet } from '../components/ds/QuickActionsBottomSheet';
import { JobsFabPlusIcon } from '../components/figma-icons/JobsScreenIcons';
import { TopHeaderProfileIcon } from '../components/figma-icons/TopHeaderIcons';
import { shellBottomNavOuterHeight } from '../components/shell/ShellBottomNav';
import { useJobsListInvalidation } from '../context/JobsListInvalidationContext';
import { useHasLiveSession, useLiveSession } from '../context/LiveSessionContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  TOP_HEADER_MAX_WIDTH,
  bg,
  cardShadowRn,
  createTextStyles,
  fg,
  space,
} from '../theme/nativeTokens';

export type HomeScreenProps = {
  onOpenProfile: () => void;
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

export function HomeScreen({ onOpenProfile }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollY = useMemo(() => new Animated.Value(0), []);
  const hasLiveSession = useHasLiveSession();
  const { startLiveSession, refresh: refreshLiveSession } = useLiveSession();
  const { invalidateJobsList } = useJobsListInvalidation();

  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
  const [recentJobs, setRecentJobs] = useState<RecentJobItem[]>([]);
  const [recentJobsLoading, setRecentJobsLoading] = useState(false);
  const [recentJobsError, setRecentJobsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

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
    setActionError(null);
    setStarting(true);
    try {
      const jobId = await createBlankJobForLiveSessionStart(supabase, { shortDescription });
      await startLiveSession({ jobId, jobShortDescription: shortDescription });
      await tryBumpJobToInProgressIfNotStarted(supabase, jobId);
      setQuickActionsVisible(false);
      invalidateJobsList();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[HomeScreen] startLiveSession (new job)', err);
      void refreshLiveSession();
      setActionError(err instanceof Error ? err.message : 'Could not start session.');
    } finally {
      setStarting(false);
    }
  }, [invalidateJobsList, refreshLiveSession, startLiveSession]);

  const headerTopPad = Math.max(insets.top - space('Spacing/12'), 0);
  const bottomNavReservedHeight =
    space('Spacing/8') + 1 + 64 + space('Spacing/8') + insets.bottom;
  const fabBottomOffset =
    space('Spacing/8') +
    insets.bottom +
    64 +
    space('Spacing/12') -
    shellBottomNavOuterHeight(insets.bottom);

  if (!fontsLoaded) {
    return (
      <View style={styles.root}>
        <CanvasTiledBackground scrollY={scrollY} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CanvasTiledBackground scrollY={scrollY} />
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
            paddingBottom: bottomNavReservedHeight + space('Spacing/20') + 72,
            flexGrow: 1,
          },
        ]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
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
      </Animated.ScrollView>

      {hasLiveSession || quickActionsVisible ? null : (
        <View style={[styles.fabWrap, { bottom: fabBottomOffset }]}>
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
