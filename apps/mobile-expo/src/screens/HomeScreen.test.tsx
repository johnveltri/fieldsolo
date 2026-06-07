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
const mockGetWeeklyNetEarningsCentsForCurrentUser = jest.fn<
  (...args: unknown[]) => Promise<{ netEarningsCents: number; jobCount: number }>
>();
const mockListJobsForCurrentUserPage = jest.fn<
  (...args: unknown[]) => Promise<{ items: unknown[]; hasMore: boolean }>
>();
const mockListRecentDetailedJobsForCurrentUser = jest.fn<
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
  getWeeklyNetEarningsCentsForCurrentUser: (...args: unknown[]) =>
    mockGetWeeklyNetEarningsCentsForCurrentUser(...args),
  listJobsForCurrentUserPage: (...args: unknown[]) => mockListJobsForCurrentUserPage(...args),
  listRecentDetailedJobsForCurrentUser: (...args: unknown[]) =>
    mockListRecentDetailedJobsForCurrentUser(...args),
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

function job(overrides: Record<string, unknown>) {
  return {
    id: 'job-1',
    shortDescription: 'Install light fixture',
    customerName: 'Alice',
    updatedAt: '2026-05-09T12:00:00.000Z',
    createdAt: '2026-05-01T12:00:00.000Z',
    lastWorkedAt: '2026-05-09T12:00:00.000Z',
    lastWorkedLabel: 'Last worked May 9, 2026',
    timeLabel: '2.0h',
    jobType: 'electrical',
    workStatus: 'inProgress',
    jobPaymentState: 'pending',
    revenueCents: 50000,
    materialsCents: -12000,
    netEarningsCents: 38000,
    collectedCents: 0,
    isFinanciallyComplete: true,
    hasMaterials: true,
    noMaterialsConfirmed: false,
    hasSessions: true,
    ...overrides,
  };
}

describe('HomeScreen quick session', () => {
  let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockIsSupabaseConfigured.mockReturnValue(true);
    mockListRecentJobsForCurrentUser.mockResolvedValue([]);
    mockGetWeeklyNetEarningsCentsForCurrentUser.mockResolvedValue({
      netEarningsCents: 0,
      jobCount: 0,
    });
    mockListJobsForCurrentUserPage.mockResolvedValue({ items: [], hasMore: false });
    mockListRecentDetailedJobsForCurrentUser.mockResolvedValue([]);
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
      <HomeScreen
        onOpenProfile={() => undefined}
        onOpenJobDetail={() => undefined}
        onOpenEarnings={() => undefined}
      />,
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
      <HomeScreen
        onOpenProfile={() => undefined}
        onOpenJobDetail={() => undefined}
        onOpenEarnings={() => undefined}
      />,
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

  it('renders home modules from API data and opens job detail from module cards', async () => {
    mockGetWeeklyNetEarningsCentsForCurrentUser.mockResolvedValue({
      netEarningsCents: 123456,
      jobCount: 2,
    });
    const middleIncompletes = Array.from({ length: 9 }, (_, i) =>
      job({
        id: `job-incomplete-${i + 2}`,
        shortDescription: `Finish task ${i + 2}`,
        isFinanciallyComplete: false,
        hasMaterials: false,
        noMaterialsConfirmed: false,
      }),
    );
    mockListJobsForCurrentUserPage.mockResolvedValue({
      items: [
        job({
          id: 'job-incomplete-1',
          shortDescription: 'Untitled Job',
          revenueCents: 0,
          isFinanciallyComplete: false,
          hasMaterials: false,
          hasSessions: false,
        }),
        ...middleIncompletes,
        job({
          id: 'job-incomplete-11',
          shortDescription: 'Wire outlet',
          isFinanciallyComplete: false,
          hasSessions: false,
        }),
      ],
      hasMore: false,
    });
    mockListRecentDetailedJobsForCurrentUser.mockResolvedValue([
      job({
        id: 'job-recent-1',
        shortDescription: 'Replace ceiling fan',
        customerName: 'Sam',
        updatedAt: '2026-05-08T12:00:00.000Z',
      }),
    ]);

    const onOpenJobDetail = jest.fn();
    const screen = render(
      <HomeScreen
        onOpenProfile={() => undefined}
        onOpenJobDetail={onOpenJobDetail}
        onOpenEarnings={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('$1,234.56')).toBeTruthy();
    });

    expect(mockGetWeeklyNetEarningsCentsForCurrentUser).toHaveBeenCalledWith({
      client: 'supabase',
    });
    expect(mockListJobsForCurrentUserPage).toHaveBeenCalledWith(
      { client: 'supabase' },
      expect.objectContaining({ tab: 'open', limit: 20, offset: 0 }),
    );
    expect(mockListRecentDetailedJobsForCurrentUser).toHaveBeenCalledWith(
      { client: 'supabase' },
      { limit: 3 },
    );
    expect(screen.getByText('Completed jobs worked in the past 7 days')).toBeTruthy();
    expect(screen.getByText('NEEDS ATTENTION')).toBeTruthy();
    expect(screen.getByText('Description, Revenue, Materials, Sessions')).toBeTruthy();
    expect(screen.getByText('10 of 11 jobs')).toBeTruthy();
    expect(screen.queryByText('Wire outlet')).toBeNull();
    expect(screen.getByText('JUMP BACK IN')).toBeTruthy();
    expect(screen.getByText('Replace ceiling fan')).toBeTruthy();

    fireEvent.press(screen.getByText('10 of 11 jobs'));
    expect(screen.getByText('Wire outlet')).toBeTruthy();
    expect(screen.getByText('11 of 11 jobs')).toBeTruthy();

    fireEvent.press(screen.getByText('Untitled Job'));
    expect(onOpenJobDetail).toHaveBeenCalledWith('job-incomplete-1');

    fireEvent.press(screen.getByText('Replace ceiling fan'));
    expect(onOpenJobDetail).toHaveBeenCalledWith('job-recent-1');
  });

  it('shows review rows for financially complete jobs with work but work not marked complete', async () => {
    mockListJobsForCurrentUserPage.mockResolvedValue({
      items: [
        job({
          id: 'job-review-1',
          shortDescription: 'Patch drywall',
          isFinanciallyComplete: true,
          workStatus: 'inProgress',
          lastWorkedAt: '2026-05-08T12:00:00.000Z',
        }),
        job({
          id: 'job-review-not-started',
          shortDescription: 'Estimate panel',
          isFinanciallyComplete: true,
          workStatus: 'notStarted',
          lastWorkedAt: '2026-05-08T12:00:00.000Z',
        }),
        job({
          id: 'job-review-on-hold',
          shortDescription: 'Paused repair',
          isFinanciallyComplete: true,
          workStatus: 'onHold',
          lastWorkedAt: '2026-05-08T12:00:00.000Z',
        }),
      ],
      hasMore: false,
    });

    const screen = render(
      <HomeScreen
        onOpenProfile={() => undefined}
        onOpenJobDetail={() => undefined}
        onOpenEarnings={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Patch drywall')).toBeTruthy();
    });
    expect(screen.getByText('Worked: Not marked complete')).toBeTruthy();
    expect(screen.getByText('Review →')).toBeTruthy();
    expect(screen.queryByText('Estimate panel')).toBeNull();
    expect(screen.queryByText('Paused repair')).toBeNull();
  });

  it('shows pending-payment rows for completed jobs in the open tab', async () => {
    mockListJobsForCurrentUserPage.mockResolvedValue({
      items: [
        job({
          id: 'job-payment-1',
          shortDescription: 'Garbage Disposal Install',
          isFinanciallyComplete: true,
          workStatus: 'completed',
          jobPaymentState: 'pending',
          lastWorkedAt: '2026-05-08T12:00:00.000Z',
        }),
        job({
          id: 'job-payment-paid',
          shortDescription: 'Paid faucet repair',
          isFinanciallyComplete: true,
          workStatus: 'paid',
          jobPaymentState: 'paid',
          lastWorkedAt: '2026-05-08T12:00:00.000Z',
        }),
      ],
      hasMore: false,
    });

    const onOpenJobDetail = jest.fn();
    const screen = render(
      <HomeScreen
        onOpenProfile={() => undefined}
        onOpenJobDetail={onOpenJobDetail}
        onOpenEarnings={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Garbage Disposal Install')).toBeTruthy();
    });
    expect(screen.getByText('Completed:')).toBeTruthy();
    expect(screen.getByText('Pending payment')).toBeTruthy();
    expect(screen.getByText('Review →')).toBeTruthy();
    expect(screen.queryByText('Paid faucet repair')).toBeNull();

    fireEvent.press(screen.getByText('Garbage Disposal Install'));
    expect(onOpenJobDetail).toHaveBeenCalledWith('job-payment-1');
  });
});
