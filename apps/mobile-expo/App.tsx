import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LiveSessionOverlay } from './src/components/LiveSessionOverlay';
import { ShellBottomNav, type ShellMainTab } from './src/components/shell/ShellBottomNav';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { BottomSheetStackProvider } from './src/context/BottomSheetStackContext';
import { JobsListInvalidationProvider } from './src/context/JobsListInvalidationContext';
import {
  LiveSessionProvider,
  useLiveSession,
} from './src/context/LiveSessionContext';
import type { ListJobsForCurrentUserTab } from '@fieldbook/api-client';
import { analytics, emailProperties } from './src/lib/analytics';
import { isSupabaseConfigured } from './src/lib/supabase';
import { EarningsScreen, type EarningsWindow } from './src/screens/EarningsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { InboxScreen } from './src/screens/InboxScreen';
import { JobsScreen } from './src/screens/JobsScreen';
import { JobDetailScreen } from './src/screens/JobDetailScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { color } from '@fieldbook/design-system/lib/tokens';

import { bg } from './src/theme/nativeTokens';

function AuthenticatedShell() {
  const { session, loading } = useAuth();
  /** When true, job detail covers tab shell (HOME / JOBS / EARNINGS); X returns here. */
  const [jobDetailOpen, setJobDetailOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobDetailEntrySource, setJobDetailEntrySource] = useState<string>('unknown');
  /** True when opening detail from "New job" FAB — JobDetailScreen auto-opens the edit sheet. */
  const [jobDetailInitialEditOpen, setJobDetailInitialEditOpen] = useState(false);
  /** Bump on each "View job" so Job Detail refetches (same user, fresh data). */
  const [jobDetailLoadKey, setJobDetailLoadKey] = useState(0);
  /** Persisted while Job Detail is open so closing returns to the same Jobs tab. */
  const [jobsListTab, setJobsListTab] = useState<ListJobsForCurrentUserTab>('all');
  /** Earnings page time window; lifted so Home can land on "Past Week". */
  const [earningsWindow, setEarningsWindow] = useState<EarningsWindow>('week');
  const [mainTab, setMainTab] = useState<ShellMainTab>('jobs');
  /** Profile is stacked over Home while staying on the HOME bottom-nav tab. */
  const [profileOpen, setProfileOpen] = useState(false);
  /** Inbox covers the shell (like Job Detail); opened from the Jobs header icon. */
  const [inboxOpen, setInboxOpen] = useState(false);
  /** Bump on each Inbox open so it refetches its unassigned captures. */
  const [inboxLoadKey, setInboxLoadKey] = useState(0);
  // Hooks must be called unconditionally — bail-out renders below still execute these.
  const liveSession = useLiveSession();

  const openInbox = useCallback(() => {
    analytics.capture('inbox_opened', { source: 'jobs_header' });
    setInboxLoadKey((k) => k + 1);
    setInboxOpen(true);
  }, []);

  useEffect(() => {
    if (mainTab !== 'home') setProfileOpen(false);
  }, [mainTab]);

  const onShellTabSelect = useCallback(
    (tab: ShellMainTab) => {
      analytics.capture('shell_tab_selected', {
        from_tab: mainTab,
        to_tab: tab,
        has_live_session: liveSession.hasLiveSession,
      });
      setMainTab(tab);
      // HOME tab tap closes Profile overlay (same tab stays selected).
      if (tab === 'home') setProfileOpen(false);
    },
    [liveSession.hasLiveSession, mainTab],
  );

  const navigateToJob = useCallback(
    (jobId: string) => {
      setJobDetailEntrySource('live_session_overlay');
      setSelectedJobId(jobId);
      setJobDetailInitialEditOpen(false);
      setJobDetailLoadKey((k) => k + 1);
      setJobDetailOpen(true);
    },
    [],
  );

  /**
   * Tapping a tab from inside `JobDetailScreen` closes the detail and
   * switches the shell to that tab. JOBS returns to `JobsScreen`; HOME and
   * EARNINGS go to their respective screens. We always close detail because
   * it covers the shell — leaving it open would just hide the tab the user
   * just navigated to.
   */
  const onJobDetailSelectShellTab = useCallback(
    (tab: ShellMainTab) => {
      analytics.capture('shell_tab_selected', {
        from_tab: 'job_detail',
        to_tab: tab,
        has_live_session: liveSession.hasLiveSession,
      });
      analytics.capture('job_detail_closed', { destination: tab });
      setMainTab(tab);
      if (tab === 'home') setProfileOpen(false);
      setJobDetailOpen(false);
      setJobDetailInitialEditOpen(false);
    },
    [liveSession.hasLiveSession],
  );

  const currentScreen = useMemo(() => {
    if (!session) return 'sign_in' as const;
    if (jobDetailOpen) return 'job_detail' as const;
    if (inboxOpen) return 'inbox' as const;
    if (mainTab === 'home' && profileOpen) return 'profile' as const;
    return mainTab;
  }, [inboxOpen, jobDetailOpen, mainTab, profileOpen, session]);

  useEffect(() => {
    if (!session) return;
    analytics.identify(session.user.id, {
      ...emailProperties(session.user.email),
      email: session.user.email ?? null,
      auth_provider: 'supabase',
    });
  }, [session?.user.id, session?.user.email, session]);

  useEffect(() => {
    analytics.screen(currentScreen, {
      auth_state: session ? 'authenticated' : 'anonymous',
      main_tab: mainTab,
      job_detail_open: jobDetailOpen,
      inbox_open: inboxOpen,
      profile_open: profileOpen,
      has_live_session: liveSession.hasLiveSession,
    });
  }, [
    currentScreen,
    inboxOpen,
    jobDetailOpen,
    liveSession.hasLiveSession,
    mainTab,
    profileOpen,
    session,
  ]);

  const openedTrackedRef = useRef(false);
  useEffect(() => {
    if (openedTrackedRef.current) return;
    openedTrackedRef.current = true;
    analytics.capture('app_opened', {
      auth_state: session ? 'authenticated' : loading ? 'loading' : 'anonymous',
      has_live_session: liveSession.hasLiveSession,
    });
  }, [liveSession.hasLiveSession, loading, session]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        analytics.capture('app_became_active', {
          auth_state: session ? 'authenticated' : 'anonymous',
          has_live_session: liveSession.hasLiveSession,
        });
      }
    });
    return () => sub.remove();
  }, [liveSession.hasLiveSession, session]);

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <SignInScreen />;
  }

  return (
    <View style={styles.root}>
      {jobDetailOpen ? (
        <JobDetailScreen
          loadKey={jobDetailLoadKey}
          jobId={selectedJobId}
          entrySource={jobDetailEntrySource}
          initialEditOpen={jobDetailInitialEditOpen}
          sessionUserId={session.user.id}
          sessionEmail={session.user.email ?? null}
          onRequestClose={() => {
            analytics.capture('job_detail_closed', { destination: mainTab });
            setJobDetailOpen(false);
            setJobDetailInitialEditOpen(false);
          }}
          onSelectShellTab={onJobDetailSelectShellTab}
        />
      ) : inboxOpen ? (
        <InboxScreen
          loadKey={inboxLoadKey}
          onRequestClose={() => {
            analytics.capture('inbox_closed', { destination: mainTab });
            setInboxOpen(false);
          }}
          onSelectShellTab={(tab) => {
            analytics.capture('shell_tab_selected', {
              from_tab: 'inbox',
              to_tab: tab,
              has_live_session: liveSession.hasLiveSession,
            });
            analytics.capture('inbox_closed', { destination: tab });
            setInboxOpen(false);
            setMainTab(tab);
            if (tab === 'home') setProfileOpen(false);
          }}
        />
      ) : (
        <View style={styles.shellColumn}>
          <View style={styles.shellMain}>
            {mainTab === 'home' && !profileOpen ? (
              <HomeScreen
                onOpenProfile={() => {
                  analytics.capture('profile_opened_from_home', {});
                  setProfileOpen(true);
                }}
                onOpenEarnings={() => {
                  analytics.capture('home_earnings_pressed', {});
                  analytics.capture('earnings_opened', {
                    source: 'home_weekly_snapshot',
                    window: 'week',
                  });
                  setEarningsWindow('week');
                  setMainTab('earnings');
                }}
                onOpenJobDetail={(jobId, options) => {
                  setJobDetailEntrySource('home');
                  setSelectedJobId(jobId ?? null);
                  setJobDetailInitialEditOpen(options?.initialEditOpen ?? false);
                  setJobDetailLoadKey((k) => k + 1);
                  setJobDetailOpen(true);
                }}
              />
            ) : null}
            {mainTab === 'home' && profileOpen ? (
              <ProfileScreen onBack={() => setProfileOpen(false)} />
            ) : null}
            {mainTab === 'jobs' ? (
              <JobsScreen
                jobsListTab={jobsListTab}
                onJobsListTabChange={setJobsListTab}
                suppressFab={liveSession.hasLiveSession}
                onOpenInbox={openInbox}
                onOpenJobDetail={(jobId?: string, options?: { initialEditOpen?: boolean }) => {
                  setJobDetailEntrySource(options?.initialEditOpen ? 'jobs_new_job' : 'jobs_list');
                  setSelectedJobId(jobId ?? null);
                  setJobDetailInitialEditOpen(options?.initialEditOpen ?? false);
                  setJobDetailLoadKey((k) => k + 1);
                  setJobDetailOpen(true);
                }}
              />
            ) : null}
            {mainTab === 'earnings' ? (
              <EarningsScreen
                window={earningsWindow}
                onWindowChange={setEarningsWindow}
                onOpenJobsOpenTab={() => {
                  setJobsListTab('open');
                  setMainTab('jobs');
                }}
                onOpenJobDetail={(jobId?: string) => {
                  setJobDetailEntrySource('earnings');
                  setSelectedJobId(jobId ?? null);
                  setJobDetailInitialEditOpen(false);
                  setJobDetailLoadKey((k) => k + 1);
                  setJobDetailOpen(true);
                }}
              />
            ) : null}
          </View>
          <ShellBottomNav selected={mainTab} onSelect={onShellTabSelect} />
        </View>
      )}

      <LiveSessionOverlay
        onNavigateToJob={({ jobId }) => navigateToJob(jobId)}
      />
    </View>
  );
}

export default function App() {
  const configured = isSupabaseConfigured();
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        {configured ? (
          <AuthProvider>
            <BottomSheetStackProvider>
              <JobsListInvalidationProvider>
                <LiveSessionProvider>
                  <AuthenticatedShell />
                </LiveSessionProvider>
              </JobsListInvalidationProvider>
            </BottomSheetStackProvider>
          </AuthProvider>
        ) : (
          <View style={[styles.root, styles.centered]}>
            <Text style={styles.configText}>
              Missing Supabase env vars. Set `EXPO_PUBLIC_SUPABASE_URL` and
              `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
            </Text>
          </View>
        )}
        <StatusBar style="dark" />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color('Foundation/Background/Default'),
  },
  shellColumn: {
    flex: 1,
    width: '100%',
    /** Match tab screens + bottom nav — avoids a lighter strip (`Background/Default`) in the nav `marginTop` gutter. */
    backgroundColor: bg.canvasWarm,
  },
  shellMain: {
    flex: 1,
    backgroundColor: bg.canvasWarm,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  configText: {
    color: color('Foundation/Text/Primary'),
    paddingHorizontal: 24,
    textAlign: 'center',
  },
});
