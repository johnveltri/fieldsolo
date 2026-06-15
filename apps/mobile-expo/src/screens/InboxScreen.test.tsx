import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { InboxScreen } from './InboxScreen';

const mockListInboxNotes = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockListInboxMaterials = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
const mockListJobsForCurrentUserPage = jest.fn<
  (...args: unknown[]) => Promise<{ items: unknown[]; hasMore: boolean }>
>();
const mockUpdateNote = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockUpdateMaterial = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockInvalidateJobsList = jest.fn<() => void>();
const mockIsSupabaseConfigured = jest.fn<() => boolean>(() => true);

jest.mock('expo-font', () => ({ useFonts: () => [true] }));

jest.mock('@fieldsolo/api-client', () => ({
  listInboxNotes: (...args: unknown[]) => mockListInboxNotes(...args),
  listInboxMaterials: (...args: unknown[]) => mockListInboxMaterials(...args),
  listJobsForCurrentUserPage: (...args: unknown[]) => mockListJobsForCurrentUserPage(...args),
  updateNote: (...args: unknown[]) => mockUpdateNote(...args),
  updateMaterial: (...args: unknown[]) => mockUpdateMaterial(...args),
}));

jest.mock('../lib/supabase', () => ({
  isSupabaseConfigured: () => mockIsSupabaseConfigured(),
  supabase: { client: 'supabase' },
}));

jest.mock('../context/JobsListInvalidationContext', () => ({
  useJobsListInvalidation: () => ({ invalidateJobsList: mockInvalidateJobsList, version: 0 }),
}));

jest.mock('../components/CanvasTiledBackground', () => ({
  CanvasTiledBackground: () => null,
}));

jest.mock('../components/figma-icons/JobDetailScreenIcons', () => ({
  SessionSheetBackIcon: () => null,
}));

jest.mock('../components/shell/ShellBottomNav', () => ({
  ShellBottomNav: () => null,
  shellBottomNavOuterHeight: () => 80,
}));

jest.mock('../components/ds', () => {
  const { Text, View, Pressable } = require('react-native');
  return {
    SectionHeader: ({ title }: { title: string }) => <Text>{title}</Text>,
    ViewNotesBuckets: ({
      buckets,
      onNotePress,
    }: {
      buckets: { notes: { id: string; excerpt: string }[] }[];
      onNotePress: (id: string) => void;
    }) => (
      <View>
        {buckets
          .flatMap((b) => b.notes)
          .map((n) => (
            <Text key={n.id} onPress={() => onNotePress(n.id)}>
              {n.excerpt}
            </Text>
          ))}
      </View>
    ),
    ViewMaterialsBuckets: ({
      buckets,
      onMaterialPress,
    }: {
      buckets: { items: { id: string; name: string }[] }[];
      onMaterialPress: (id: string) => void;
    }) => (
      <View>
        {buckets
          .flatMap((b) => b.items)
          .map((m) => (
            <Text key={m.id} onPress={() => onMaterialPress(m.id)}>
              {m.name}
            </Text>
          ))}
      </View>
    ),
    ChooseJobBottomSheet: ({
      visible,
      jobs,
      onSelect,
    }: {
      visible: boolean;
      jobs: { id: string; shortDescription: string }[];
      onSelect: (jobId: string) => void;
    }) => {
      if (!visible) return null;
      return (
        <View>
          {jobs.map((j) => (
            <Pressable key={j.id} accessibilityRole="button" onPress={() => onSelect(j.id)}>
              <Text>{`pick ${j.shortDescription}`}</Text>
            </Pressable>
          ))}
        </View>
      );
    },
  };
});

function nowIso(): string {
  return new Date().toISOString();
}

describe('InboxScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSupabaseConfigured.mockReturnValue(true);
    mockListInboxNotes.mockResolvedValue([]);
    mockListInboxMaterials.mockResolvedValue([]);
    mockListJobsForCurrentUserPage.mockResolvedValue({ items: [], hasMore: false });
    mockUpdateNote.mockResolvedValue(undefined);
    mockUpdateMaterial.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists unassigned notes under a recency header and assigns one to a job', async () => {
    mockListInboxNotes.mockResolvedValue([
      {
        id: 'note-1',
        body: 'Buy a new gasket',
        sessionId: null,
        excerpt: 'Buy a new gasket',
        dateLabel: 'Jun 7, 2026',
        createdAt: nowIso(),
      },
    ]);
    mockListJobsForCurrentUserPage
      .mockResolvedValueOnce({
        items: [{ id: 'job-1', shortDescription: 'First page job', customerName: 'Bob' }],
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [{ id: 'job-9', shortDescription: 'Kitchen remodel', customerName: 'Alice' }],
        hasMore: false,
      });

    const onRequestClose = jest.fn();
    const screen = render(
      <InboxScreen loadKey={1} onRequestClose={onRequestClose} onSelectShellTab={() => undefined} />,
    );

    await waitFor(() => {
      expect(screen.getByText('Buy a new gasket')).toBeTruthy();
    });
    expect(screen.getByText('TODAY')).toBeTruthy();
    expect(screen.getByText('Notes')).toBeTruthy();

    fireEvent.press(screen.getByText('Buy a new gasket'));

    await waitFor(() => {
      expect(screen.getByText('pick Kitchen remodel')).toBeTruthy();
    });
    expect(mockListJobsForCurrentUserPage).toHaveBeenNthCalledWith(
      1,
      { client: 'supabase' },
      { limit: 100, offset: 0, tab: 'all' },
    );
    expect(mockListJobsForCurrentUserPage).toHaveBeenNthCalledWith(
      2,
      { client: 'supabase' },
      { limit: 100, offset: 1, tab: 'all' },
    );

    fireEvent.press(screen.getByText('pick Kitchen remodel'));

    await waitFor(() => {
      expect(mockUpdateNote).toHaveBeenCalledWith(
        { client: 'supabase' },
        'note-1',
        { sessionId: null, jobId: 'job-9' },
      );
    });
    expect(mockInvalidateJobsList).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByText('Buy a new gasket')).toBeNull();
    });
  });

  it('shows the materials tab with an empty state', async () => {
    mockListInboxNotes.mockResolvedValue([]);
    mockListInboxMaterials.mockResolvedValue([]);

    const screen = render(
      <InboxScreen loadKey={1} onRequestClose={() => undefined} onSelectShellTab={() => undefined} />,
    );

    await waitFor(() => {
      expect(screen.getByText('All caught up! No unassigned notes.')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Materials'));
    expect(screen.getByText('All caught up! No unassigned materials.')).toBeTruthy();
  });
});
