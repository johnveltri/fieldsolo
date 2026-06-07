import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
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
import { isSupabaseConfigured } from './src/lib/supabase';
import { EarningsScreen, type EarningsWindow } from './src/screens/EarningsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
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

  useEffect(() => {
    if (mainTab !== 'home') setProfileOpen(false);
  }, [mainTab]);

  const onShellTabSelect = useCallback((tab: ShellMainTab) => {
    setMainTab(tab);
    // HOME tab tap closes Profile overlay (same tab stays selected).
    if (tab === 'home') setProfileOpen(false);
  }, []);

  // Hooks must be called unconditionally — bail-out renders below still execute these.
  const liveSession = useLiveSession();

  const navigateToJob = useCallback(
    (jobId: string) => {
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
  const onJobDetailSelectShellTab = useCallback((tab: ShellMainTab) => {
    setMainTab(tab);
    if (tab === 'home') setProfileOpen(false);
    setJobDetailOpen(false);
    setJobDetailInitialEditOpen(false);
  }, []);

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
      {!jobDetailOpen ? (
        <View style={styles.shellColumn}>
          <View style={styles.shellMain}>
            {mainTab === 'home' && !profileOpen ? (
              <HomeScreen
                onOpenProfile={() => setProfileOpen(true)}
                onOpenEarnings={() => {
                  setEarningsWindow('week');
                  setMainTab('earnings');
                }}
                onOpenJobDetail={(jobId, options) => {
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
                onOpenJobDetail={(jobId?: string, options?: { initialEditOpen?: boolean }) => {
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
      ) : (
        <JobDetailScreen
          loadKey={jobDetailLoadKey}
          jobId={selectedJobId}
          initialEditOpen={jobDetailInitialEditOpen}
          sessionUserId={session.user.id}
          sessionEmail={session.user.email ?? null}
          onRequestClose={() => {
            setJobDetailOpen(false);
            setJobDetailInitialEditOpen(false);
          }}
          onSelectShellTab={onJobDetailSelectShellTab}
        />
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
