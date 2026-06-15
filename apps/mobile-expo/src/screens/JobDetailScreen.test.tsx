import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { JobDetailScreen } from './JobDetailScreen';
import type { JobDetailViewModel } from '@fieldsolo/shared-types';

jest.mock('expo-font', () => ({
  useFonts: () => [true],
}));

// JobDetailScreen consumes the global LiveSessionContext to wire the
// "Live Session" tile on the New Session chooser and to refetch when the
// in-progress live session for the current job ends. The full provider
// requires Supabase env + AuthContext + AppState wiring that's out of
// scope for these tests, so we stub it here with a no-op shape that
// reports "no live session in progress".
jest.mock('../context/JobsListInvalidationContext', () => ({
  useJobsListInvalidation: () => ({
    version: 0,
    invalidateJobsList: jest.fn(),
  }),
}));

jest.mock('../context/LiveSessionContext', () => ({
  useLiveSession: () => ({
    liveSession: null,
    hydrating: false,
    hasLiveSession: false,
    mode: 'hidden' as const,
    startLiveSession: jest.fn(),
    openSheet: jest.fn(),
    minimize: jest.fn(),
    openEditSheet: jest.fn(),
    closeEditSheet: jest.fn(),
    minimizeFromEdit: jest.fn(),
    endLiveSessionNow: jest.fn(),
    updateLiveSessionStartedAt: jest.fn(),
    deleteLiveSessionNow: jest.fn(),
    updateLiveSessionJobShortDescription: jest.fn(),
    refresh: jest.fn(),
  }),
  useHasLiveSession: () => false,
}));

jest.mock('../components/CanvasTiledBackground', () => ({
  CanvasTiledBackground: () => null,
}));

jest.mock('../components/bottom-nav/BottomNavTabIcons', () => ({
  BottomNavIconEarnings: () => null,
  BottomNavIconHome: () => null,
  BottomNavIconJobs: () => null,
}));

jest.mock('../components/figma-icons/JobDetailScreenIcons', () => ({
  JobDetailIconCtaMore: () => null,
  JobDetailIconSectionAdd: () => null,
  JobDetailIconSectionMaterials: () => null,
  JobDetailIconSectionNotes: () => null,
  JobDetailIconSectionSessions: () => null,
  JobDetailIconTopClose: () => null,
  JobDetailIconTopEdit: () => null,
  JobDetailIconViewNote: () => null,
}));

jest.mock('../components/ds', () => ({
  EditJobBottomSheet: () => null,
  JobDetailCtaRow: () => null,
  JobDetailJobHeader: () => null,
  JobDetailMetricTertiary: () => null,
  JobDetailSummaryCard: () => null,
  EditMaterialBottomSheet: ({
    visible,
    title,
    values,
    assignedSession,
    onSavePress,
    onDeletePress,
    onSessionPillPress,
    onUnitPress,
  }: {
    visible: boolean;
    title: string;
    values: {
      description: string;
      quantity: number;
      unit: string;
      unitCostCents: number;
    };
    assignedSession: { id: string } | null;
    onSavePress?: (values: {
      description: string;
      unitCostCents: number;
      quantity: number;
      unit: string;
    }) => void;
    onDeletePress?: () => void;
    onSessionPillPress?: (values: {
      description: string;
      unitCostCents: number;
      quantity: number;
      unit: string;
    }) => void;
    onUnitPress?: (values: {
      description: string;
      unitCostCents: number;
      quantity: number;
      unit: string;
    }) => void;
  }) => {
    const { Text, View } = require('react-native');
    // The real sheet holds description / price / qty in LOCAL state and must
    // lift them to the parent when the user taps the unit / session pill —
    // otherwise they reset when the sheet becomes hidden and is reopened.
    // The mock below forwards the `values` prop as-is for the baseline calls,
    // and exposes an explicit "Type Draft and Open Unit Picker" action the
    // tests can use to simulate a user who typed overrides before tapping
    // the unit cell.
    const typedDraft = {
      description: 'Copper wire',
      unitCostCents: 250,
      quantity: 3,
      unit: values.unit,
    };
    return visible ? (
      <View>
        <Text>{title}</Text>
        <Text>{`Description ${values.description}`}</Text>
        <Text>{`Unit Cost Cents ${values.unitCostCents}`}</Text>
        <Text>{`Quantity ${values.quantity}`}</Text>
        <Text>{`Unit ${values.unit}`}</Text>
        <Text>
          {assignedSession
            ? `Material assigned ${assignedSession.id}`
            : 'Material unassigned'}
        </Text>
        <Text onPress={() => onSessionPillPress?.(values)}>Open Material Session Picker</Text>
        <Text onPress={() => onUnitPress?.(values)}>Open Unit Picker</Text>
        <Text onPress={() => onUnitPress?.(typedDraft)}>
          Type Draft and Open Unit Picker
        </Text>
        <Text onPress={() => onSavePress?.(typedDraft)}>Save Material</Text>
        <Text onPress={() => onDeletePress?.()}>Delete Material</Text>
      </View>
    ) : null;
  },
  DropdownBottomSheet: ({
    visible,
    options,
    onSelect,
  }: {
    visible: boolean;
    options: Array<{ id: string; label: string; value: string }>;
    onSelect: (value: string) => void;
  }) => {
    const { Text, View } = require('react-native');
    return visible ? (
      <View>
        {options.map((o) => (
          <Text key={o.id} onPress={() => onSelect(o.value)}>{`Pick unit ${o.value}`}</Text>
        ))}
      </View>
    ) : null;
  },
  NewSessionBottomSheet: ({
    visible,
    onLogPastPress,
  }: {
    visible: boolean;
    onLogPastPress?: () => void;
  }) => {
    const { Text, View } = require('react-native');
    return visible ? (
      <View>
        <Text>new-session-sheet</Text>
        <Text onPress={() => onLogPastPress?.()}>Log Past Session</Text>
      </View>
    ) : null;
  },
  EditSessionBottomSheet: ({
    visible,
    title,
    onSavePress,
    onDeletePress,
  }: {
    visible: boolean;
    title: string;
    onSavePress?: (values: { startedAt: string; endedAt: string }) => void;
    onDeletePress?: () => void;
  }) => {
    const { Text, View } = require('react-native');
    return visible ? (
      <View>
        <Text>{title}</Text>
        <Text
          onPress={() =>
            onSavePress?.({
              startedAt: '2026-04-18T14:00:00.000Z',
              endedAt: '2026-04-18T16:00:00.000Z',
            })
          }
        >
          Save Session
        </Text>
        <Text onPress={() => onDeletePress?.()}>Delete Session</Text>
      </View>
    ) : null;
  },
  // Keep this mock's signature in sync with the real EditNoteBottomSheet
  // contract: `onSessionPillPress` lifts the current body up to the parent.
  EditNoteBottomSheet: ({
    visible,
    title,
    assignedSession,
    onSavePress,
    onDeletePress,
    onSessionPillPress,
  }: {
    visible: boolean;
    title: string;
    assignedSession: { id: string } | null;
    onSavePress?: (values: { body: string }) => void;
    onDeletePress?: () => void;
    onSessionPillPress?: (values: { body: string }) => void;
  }) => {
    const { Text, View } = require('react-native');
    return visible ? (
      <View>
        <Text>{title}</Text>
        <Text>{assignedSession ? `Assigned ${assignedSession.id}` : 'Unassigned'}</Text>
        <Text onPress={() => onSessionPillPress?.({ body: 'Saved note body' })}>
          Open Session Picker
        </Text>
        <Text onPress={() => onSavePress?.({ body: 'Saved note body' })}>Save Note</Text>
        <Text onPress={() => onDeletePress?.()}>Delete Note</Text>
      </View>
    ) : null;
  },
  ChooseSessionBottomSheet: ({
    visible,
    sessions,
    onSelect,
    onRemove,
  }: {
    visible: boolean;
    sessions: Array<{ id: string }>;
    onSelect: (sessionId: string) => void;
    onRemove?: () => void;
  }) => {
    const { Text, View } = require('react-native');
    return visible ? (
      <View>
        {sessions.map((s) => (
          <Text key={s.id} onPress={() => onSelect(s.id)}>{`Pick ${s.id}`}</Text>
        ))}
        <Text onPress={() => onRemove?.()}>Remove Session</Text>
      </View>
    ) : null;
  },
  ViewMaterialsBuckets: ({
    buckets,
    onMaterialPress,
  }: {
    buckets: Array<{
      items: Array<{
        id: string;
        name: string;
        quantityLabel: string;
        priceLabel: string;
      }>;
    }>;
    onMaterialPress?: (materialId: string) => void;
  }) => {
    const { Text, View } = require('react-native');
    return (
      <View>
        {buckets
          .flatMap((b) => b.items)
          .map((m) => (
            <View key={m.id}>
              <Text onPress={() => onMaterialPress?.(m.id)}>{m.name}</Text>
              <Text>{m.quantityLabel}</Text>
              <Text>{m.priceLabel}</Text>
            </View>
          ))}
      </View>
    );
  },
  ViewNotesBuckets: ({
    buckets,
    onNotePress,
  }: {
    buckets: Array<{
      notes: Array<{
        id: string;
        excerpt: string;
        dateLabel: string;
      }>;
    }>;
    onNotePress?: (noteId: string) => void;
  }) => {
    const { Text, View } = require('react-native');
    return (
      <View>
        {buckets
          .flatMap((b) => b.notes)
          .map((n) => (
            <View key={n.id}>
              <Text onPress={() => onNotePress?.(n.id)}>{n.excerpt}</Text>
              <Text>{n.dateLabel}</Text>
            </View>
          ))}
      </View>
    );
  },
  SessionCard: ({
    session,
    onEditPress,
    onAddNote,
    onAddMaterial,
    onPressAttachment,
  }: {
    session: {
      id: string;
      dateLabel: string;
      attachments?: Array<{ kind: 'note' | 'material'; id: string; title: string }>;
    };
    onEditPress: () => void;
    onAddNote: () => void;
    onAddMaterial: () => void;
    onPressAttachment: (item: { kind: 'note' | 'material'; id: string }) => void;
  }) => {
    const { Text, View } = require('react-native');
    return (
      <View>
        <Text>{session.dateLabel}</Text>
        <Text onPress={onEditPress}>{`Edit session ${session.id}`}</Text>
        <Text onPress={onAddNote}>{`Add note to session ${session.id}`}</Text>
        <Text onPress={onAddMaterial}>{`Add material to session ${session.id}`}</Text>
        {session.attachments?.map((item) => (
          <Text
            key={`${item.kind}-${item.id}`}
            onPress={() => onPressAttachment({ kind: item.kind, id: item.id })}
          >
            {`Open ${item.kind} attachment ${item.id}`}
          </Text>
        ))}
      </View>
    );
  },
}));

jest.mock('@fieldsolo/api-client', () => ({
  createManualSession: jest.fn(),
  createMaterial: jest.fn(),
  createNote: jest.fn(),
  deleteMaterial: jest.fn(),
  deleteNote: jest.fn(),
  deleteSession: jest.fn(),
  deleteJobById: jest.fn(),
  fetchFirstJobIdForCurrentUser: jest.fn(),
  fetchJobDetail: jest.fn(),
  updateJobById: jest.fn(),
  updateJobNoMaterialsConfirmed: jest.fn(),
  isNoMaterialsConfirmedColumnMissingError: jest.fn(() => false),
  updateJobStatusById: jest.fn(),
  updateMaterial: jest.fn(),
  updateNote: jest.fn(),
  updateSessionTimes: jest.fn(),
}));

jest.mock('../lib/supabase', () => ({
  isSupabaseConfigured: jest.fn(() => true),
  supabase: {},
}));

describe('JobDetailScreen manual session and note flows', () => {
  const apiClient = jest.requireMock('@fieldsolo/api-client') as any;

  const baseJob: JobDetailViewModel = {
    id: 'job-1',
    shortDescription: 'Fixture install',
    customerName: 'Alice',
    serviceAddress: '1 Main St',
    jobType: 'electrical',
    lastWorkedLabel: 'Last worked Apr 18, 2026',
    workStatus: 'inProgress',
    earnings: {
      revenueCents: 10000,
      materialsCents: -500,
      feesCents: 0,
      netEarningsCents: 9500,
    },
    metrics: {
      timeLabel: '2.0h',
      netPerHrDisplay: '$47.50/hr',
      sessionCount: 1,
    },
    displaySessions: [
      {
        id: 'sess-1',
        startedAt: '2026-04-17T14:00:00.000Z',
        endedAt: '2026-04-17T15:00:00.000Z',
        dateLabel: 'Apr 17, 2026',
        timeRangeLabel: '9:00 AM – 10:00 AM',
        durationLabel: '1.0h',
        attachments: [],
      },
    ],
    allSessions: [
      {
        id: 'sess-1',
        startedAt: '2026-04-17T14:00:00.000Z',
        endedAt: '2026-04-17T15:00:00.000Z',
        dateLabel: 'Apr 17, 2026',
        timeRangeLabel: '9:00 AM – 10:00 AM',
        durationLabel: '1.0h',
        attachments: [],
      },
    ],
    inProgressSession: null,
    materialBuckets: [],
    noteBuckets: [
      {
        id: 'note-unassigned',
        kind: 'unassigned',
        notes: [
          {
            id: 'note-1',
            body: 'Existing note body',
            sessionId: null,
            excerpt: 'Existing note excerpt',
            dateLabel: 'Apr 18, 2026',
          },
        ],
      },
    ],
    noMaterialsConfirmed: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.fetchJobDetail.mockResolvedValue(baseJob);
    apiClient.createManualSession.mockResolvedValue('sess-new-1');
    apiClient.updateSessionTimes.mockResolvedValue(undefined);
    apiClient.deleteSession.mockResolvedValue(undefined);
    apiClient.createNote.mockResolvedValue('note-new-1');
    apiClient.updateNote.mockResolvedValue(undefined);
    apiClient.deleteNote.mockResolvedValue(undefined);
    apiClient.createMaterial.mockResolvedValue('mat-new-1');
    apiClient.updateMaterial.mockResolvedValue(undefined);
    apiClient.deleteMaterial.mockResolvedValue(undefined);
    apiClient.updateJobNoMaterialsConfirmed.mockResolvedValue(undefined);
    apiClient.updateJobStatusById.mockResolvedValue(undefined);
  });

  it('creates a manual session from add flow', async () => {
    const screen = render(<JobDetailScreen jobId="job-1" sessionUserId="user-1" />);

    await waitFor(() => {
      expect(apiClient.fetchJobDetail).toHaveBeenCalledWith({}, 'job-1');
    });

    fireEvent.press(screen.getByLabelText('Add SESSIONS'));
    fireEvent.press(screen.getByText('Log Past Session'));
    fireEvent.press(screen.getByText('Save Session'));

    await waitFor(() => {
      expect(apiClient.createManualSession).toHaveBeenCalledWith({}, {
        jobId: 'job-1',
        startedAt: '2026-04-18T14:00:00.000Z',
        endedAt: '2026-04-18T16:00:00.000Z',
      });
    });
  });

  it('updates an existing session from edit flow', async () => {
    const screen = render(<JobDetailScreen jobId="job-1" sessionUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Edit session sess-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Edit session sess-1'));
    fireEvent.press(screen.getByText('Save Session'));

    await waitFor(() => {
      expect(apiClient.updateSessionTimes).toHaveBeenCalledWith({}, 'sess-1', {
        startedAt: '2026-04-18T14:00:00.000Z',
        endedAt: '2026-04-18T16:00:00.000Z',
      });
    });
  });

  it('deletes a session from edit flow', async () => {
    const screen = render(<JobDetailScreen jobId="job-1" sessionUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Edit session sess-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Edit session sess-1'));
    fireEvent.press(screen.getByText('Delete Session'));

    await waitFor(() => {
      expect(apiClient.deleteSession).toHaveBeenCalledWith({}, 'sess-1');
    });
  });

  it('creates a note without session assignment', async () => {
    const screen = render(<JobDetailScreen jobId="job-1" sessionUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Add NOTES')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Add NOTES'));
    fireEvent.press(screen.getByText('Save Note'));

    await waitFor(() => {
      expect(apiClient.createNote).toHaveBeenCalledWith({}, {
        jobId: 'job-1',
        sessionId: null,
        body: 'Saved note body',
      });
    });
  });

  it('creates a note assigned to a selected session', async () => {
    const screen = render(<JobDetailScreen jobId="job-1" sessionUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Add NOTES')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Add NOTES'));
    fireEvent.press(screen.getByText('Open Session Picker'));
    fireEvent.press(screen.getByText('Pick sess-1'));
    fireEvent.press(screen.getByText('Save Note'));

    await waitFor(() => {
      expect(apiClient.createNote).toHaveBeenCalledWith({}, {
        jobId: 'job-1',
        sessionId: 'sess-1',
        body: 'Saved note body',
      });
    });
  });

  it('creates a note from a session card add action', async () => {
    const screen = render(<JobDetailScreen jobId="job-1" sessionUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Add note to session sess-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Add note to session sess-1'));
    expect(screen.getByText('Assigned sess-1')).toBeTruthy();
    fireEvent.press(screen.getByText('Save Note'));

    await waitFor(() => {
      expect(apiClient.createNote).toHaveBeenCalledWith({}, {
        jobId: 'job-1',
        sessionId: 'sess-1',
        body: 'Saved note body',
      });
    });
  });

  it('updates an existing note from edit flow', async () => {
    const screen = render(<JobDetailScreen jobId="job-1" sessionUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Existing note excerpt')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Existing note excerpt'));
    fireEvent.press(screen.getByText('Save Note'));

    await waitFor(() => {
      expect(apiClient.updateNote).toHaveBeenCalledWith({}, 'note-1', {
        body: 'Saved note body',
        sessionId: null,
        jobId: 'job-1',
      });
    });
  });

  it('soft-deletes an existing note from edit flow', async () => {
    const screen = render(<JobDetailScreen jobId="job-1" sessionUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Existing note excerpt')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Existing note excerpt'));
    fireEvent.press(screen.getByText('Delete Note'));

    await waitFor(() => {
      expect(apiClient.deleteNote).toHaveBeenCalledWith({}, 'note-1');
    });
  });

  it('hides in-progress sessions from session cards but lists them in the session picker', async () => {
    apiClient.fetchJobDetail.mockResolvedValueOnce({
      ...baseJob,
      displaySessions: [
        ...baseJob.displaySessions,
      ],
      allSessions: [
        ...baseJob.allSessions,
        {
          id: 'sess-progress',
          startedAt: '2026-04-18T09:00:00.000Z',
          endedAt: null,
          dateLabel: 'Apr 18, 2026',
          timeRangeLabel: '9:00 AM – …',
          durationLabel: '0.2h',
          attachments: [],
        },
      ],
      inProgressSession: {
        id: 'sess-progress',
        startedAt: '2026-04-18T09:00:00.000Z',
        endedAt: null,
        dateLabel: 'Apr 18, 2026',
        timeRangeLabel: '9:00 AM – …',
        durationLabel: '0.2h',
        attachments: [],
      },
    });

    const screen = render(<JobDetailScreen jobId="job-1" sessionUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Edit session sess-1')).toBeTruthy();
    });
    expect(screen.queryByText('Edit session sess-progress')).toBeNull();

    fireEvent.press(screen.getByLabelText('Add NOTES'));
    fireEvent.press(screen.getByText('Open Session Picker'));
    expect(screen.getByText('Pick sess-1')).toBeTruthy();
    expect(screen.getByText('Pick sess-progress')).toBeTruthy();
  });

  // --- Materials ---

  const jobWithMaterial: JobDetailViewModel = {
    ...baseJob,
    materialBuckets: [
      {
        id: 'mat-unassigned',
        kind: 'unassigned',
        items: [
          {
            id: 'mat-1',
            sessionId: null,
            name: 'Existing material',
            quantity: 2,
            unit: 'ea',
            unitCostCents: 500,
            quantityLabel: '2 ea @ $5.00',
            priceLabel: '$10.00',
          },
        ],
      },
    ],
  };

  it('creates a material without session assignment', async () => {
    const screen = render(<JobDetailScreen jobId="job-1" sessionUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Add MATERIALS')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Add MATERIALS'));
    fireEvent.press(screen.getByText('Save Material'));

    await waitFor(() => {
      expect(apiClient.createMaterial).toHaveBeenCalledWith({}, {
        jobId: 'job-1',
        sessionId: null,
        description: 'Copper wire',
        quantity: 3,
        unit: 'ea',
        unitCostCents: 250,
      });
    });
  });

  it('creates a material assigned to a selected session', async () => {
    const screen = render(<JobDetailScreen jobId="job-1" sessionUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Add MATERIALS')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Add MATERIALS'));
    fireEvent.press(screen.getByText('Open Material Session Picker'));
    fireEvent.press(screen.getByText('Pick sess-1'));
    fireEvent.press(screen.getByText('Save Material'));

    await waitFor(() => {
      expect(apiClient.createMaterial).toHaveBeenCalledWith({}, {
        jobId: 'job-1',
        sessionId: 'sess-1',
        description: 'Copper wire',
        quantity: 3,
        unit: 'ea',
        unitCostCents: 250,
      });
    });
  });

  it('creates a material from a session card add action', async () => {
    const screen = render(<JobDetailScreen jobId="job-1" sessionUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Add material to session sess-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Add material to session sess-1'));
    expect(screen.getByText('Material assigned sess-1')).toBeTruthy();
    fireEvent.press(screen.getByText('Save Material'));

    await waitFor(() => {
      expect(apiClient.createMaterial).toHaveBeenCalledWith({}, {
        jobId: 'job-1',
        sessionId: 'sess-1',
        description: 'Copper wire',
        quantity: 3,
        unit: 'ea',
        unitCostCents: 250,
      });
    });
  });

  it('opens the unit dropdown and applies the selected unit on save', async () => {
    const screen = render(<JobDetailScreen jobId="job-1" sessionUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Add MATERIALS')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Add MATERIALS'));
    // Default unit prefill.
    expect(screen.getByText('Unit ea')).toBeTruthy();
    fireEvent.press(screen.getByText('Open Unit Picker'));
    fireEvent.press(screen.getByText('Pick unit ft'));
    // Back on the material sheet — unit label refreshed.
    expect(screen.getByText('Unit ft')).toBeTruthy();
    fireEvent.press(screen.getByText('Save Material'));

    await waitFor(() => {
      expect(apiClient.createMaterial).toHaveBeenCalledWith({}, {
        jobId: 'job-1',
        sessionId: null,
        description: 'Copper wire',
        quantity: 3,
        unit: 'ft',
        unitCostCents: 250,
      });
    });
  });

  // Regression: tapping the unit cell (or the session pill) while the user
  // has typed values must lift those values up into parent draft state,
  // otherwise the sheet resets to its pre-edit values on return. See
  // https://… (bug: "cleared everything I had previously entered" after
  // selecting a unit in the dropdown).
  it('preserves typed draft values across the unit-picker round-trip', async () => {
    const screen = render(<JobDetailScreen jobId="job-1" sessionUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByLabelText('Add MATERIALS')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Add MATERIALS'));
    // Initial blanks from openAddMaterial.
    expect(screen.getByText('Description ')).toBeTruthy();
    expect(screen.getByText('Unit Cost Cents 0')).toBeTruthy();
    expect(screen.getByText('Quantity 1')).toBeTruthy();

    // Simulate: user typed description / price / qty, then tapped the unit
    // cell — the mock emits those values via `onUnitPress(currentDraft)`.
    fireEvent.press(screen.getByText('Type Draft and Open Unit Picker'));
    fireEvent.press(screen.getByText('Pick unit ft'));

    // On return the sheet must be reseeded from the cached draft, not from
    // the pristine openAddMaterial defaults.
    expect(screen.getByText('Description Copper wire')).toBeTruthy();
    expect(screen.getByText('Unit Cost Cents 250')).toBeTruthy();
    expect(screen.getByText('Quantity 3')).toBeTruthy();
    expect(screen.getByText('Unit ft')).toBeTruthy();
  });

  it('updates an existing material from edit flow', async () => {
    apiClient.fetchJobDetail.mockResolvedValue(jobWithMaterial);
    const screen = render(<JobDetailScreen jobId="job-1" sessionUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Existing material')).toBeTruthy();
    });

    // View-only row shows qty + unit + per-unit cost inline ("2 ea @ $5.00"),
    // while the right column continues to render the total (`priceLabel`).
    expect(screen.getByText('2 ea @ $5.00')).toBeTruthy();
    expect(screen.getByText('$10.00')).toBeTruthy();

    fireEvent.press(screen.getByText('Existing material'));
    fireEvent.press(screen.getByText('Save Material'));

    await waitFor(() => {
      expect(apiClient.updateMaterial).toHaveBeenCalledWith({}, 'mat-1', {
        description: 'Copper wire',
        quantity: 3,
        unit: 'ea',
        unitCostCents: 250,
        sessionId: null,
        jobId: 'job-1',
      });
    });
  });

  it('soft-deletes an existing material from edit flow', async () => {
    apiClient.fetchJobDetail.mockResolvedValue(jobWithMaterial);
    const screen = render(<JobDetailScreen jobId="job-1" sessionUserId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Existing material')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Existing material'));
    fireEvent.press(screen.getByText('Delete Material'));

    await waitFor(() => {
      expect(apiClient.deleteMaterial).toHaveBeenCalledWith({}, 'mat-1');
    });
  });
});
