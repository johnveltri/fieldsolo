import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { HomeScreen } from './HomeScreen';

const mockCreateBlankJobForLiveSessionStart = jest.fn<
  (...args: unknown[]) => Promise<string>
>();
const mockDeleteJobById = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockListRecentJobsForCurrentUser = jest.fn<
  (...args: unknown[]) => Promise<unknown[]>
>();
const mockTryBumpJobToInProgressIfNotStarted = jest.fn<
  (...args: unknown[]) => Promise<void>
>();
const mockStartLiveSession = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockRefreshLiveSession = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockInvalidateJobsList = jest.fn<() => void>();
const mockIsSupabaseConfigured = jest.fn<() => boolean>(() => true);

jest.mock('expo-font', () => ({
  useFonts: () => [true],
}));

jest.mock('@fieldbook/api-client', () => ({
  createBlankJobForLiveSessionStart: (...args: unknown[]) =>
    mockCreateBlankJobForLiveSessionStart(...args),
  deleteJobById: (...args: unknown[]) => mockDeleteJobById(...args),
  listRecentJobsForCurrentUser: (...args: unknown[]) => mockListRecentJobsForCurrentUser(...args),
  getWeeklyNetEarningsCentsForCurrentUser: jest.fn(() =>
    Promise.resolve({ netEarningsCents: 0, jobCount: 0 }),
  ),
  listJobsForCurrentUserPage: jest.fn(() => Promise.resolve({ items: [], hasMore: false })),
  listRecentDetailedJobsForCurrentUser: jest.fn(() => Promise.resolve([])),
  tryBumpJobToInProgressIfNotStarted: (...args: unknown[]) =>
    mockTryBumpJobToInProgressIfNotStarted(...args),
}));

jest.mock('../lib/supabase', () => ({
  isSupabaseConfigured: () => mockIsSupabaseConfigured(),
  supabase: { client: 'supabase' },
}));

jest.mock('../context/LiveSessionContext', () => ({
  useHasLiveSession: () => false,
  useLiveSession: () => ({
    startLiveSession: (...args: unknown[]) => mockStartLiveSession(...args),
    refresh: (...args: unknown[]) => mockRefreshLiveSession(...args),
  }),
}));

jest.mock('../context/JobsListInvalidationContext', () => ({
  useJobsListInvalidation: () => ({
    invalidateJobsList: mockInvalidateJobsList,
    version: 0,
  }),
}));

jest.mock('../components/CanvasTiledBackground', () => ({
  CanvasTiledBackground: () => null,
}));

jest.mock('../components/figma-icons/JobsScreenIcons', () => ({
  JobsFabPlusIcon: () => null,
}));

jest.mock('../components/figma-icons/TopHeaderIcons', () => ({
  TopHeaderProfileIcon: () => null,
}));

jest.mock('../components/ds/QuickActionsBottomSheet', () => ({
  QuickActionsBottomSheet: ({
    visible,
    actionError,
    onStartNewSession,
  }: {
    visible: boolean;
    actionError: string | null;
    onStartNewSession: () => void;
  }) => {
    const { Text, View } = require('react-native');
    if (!visible) return null;
    return (
      <View>
        <Text onPress={onStartNewSession}>Start New Session</Text>
        {actionError ? <Text>{actionError}</Text> : null}
      </View>
    );
  },
}));

jest.mock('../components/shell/ShellBottomNav', () => ({
  shellBottomNavOuterHeight: () => 80,
}));

describe('HomeScreen quick session', () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockIsSupabaseConfigured.mockReturnValue(true);
    mockListRecentJobsForCurrentUser.mockResolvedValue([]);
    mockTryBumpJobToInProgressIfNotStarted.mockResolvedValue(undefined);
    mockDeleteJobById.mockResolvedValue(undefined);
    mockRefreshLiveSession.mockResolvedValue(null);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('cleans up the temporary quick-session job when starting the live session fails', async () => {
    mockCreateBlankJobForLiveSessionStart.mockResolvedValue('job-temp-1');
    mockStartLiveSession.mockRejectedValue(new Error('duplicate active session'));

    const screen = render(
      <HomeScreen onOpenProfile={() => undefined} onOpenJobDetail={() => undefined} />,
    );

    fireEvent.press(screen.getByLabelText('Quick capture'));
    fireEvent.press(await screen.findByText('Start New Session'));

    await waitFor(() => {
      expect(mockDeleteJobById).toHaveBeenCalledWith(
        { client: 'supabase' },
        'job-temp-1',
      );
    });
    expect(mockRefreshLiveSession).toHaveBeenCalledTimes(1);
    expect(mockInvalidateJobsList).toHaveBeenCalledTimes(1);
    expect(screen.getByText('duplicate active session')).toBeTruthy();
  });

  it('preserves the temporary job when refresh confirms the live session actually started', async () => {
    mockCreateBlankJobForLiveSessionStart.mockResolvedValue('job-temp-2');
    mockStartLiveSession.mockRejectedValue(new Error('network after insert'));
    mockRefreshLiveSession.mockResolvedValue({
      id: 'sess-1',
      jobId: 'job-temp-2',
      startedAt: '2026-05-09T12:00:00.000Z',
      startedTz: 'America/Chicago',
      jobShortDescription: 'Live Session May 9 at 12:00 PM',
    });

    const screen = render(
      <HomeScreen onOpenProfile={() => undefined} onOpenJobDetail={() => undefined} />,
    );

    fireEvent.press(screen.getByLabelText('Quick capture'));
    fireEvent.press(await screen.findByText('Start New Session'));

    await waitFor(() => {
      expect(mockRefreshLiveSession).toHaveBeenCalledTimes(1);
    });
    expect(mockDeleteJobById).not.toHaveBeenCalled();
    expect(mockInvalidateJobsList).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('network after insert')).toBeNull();
  });
});
