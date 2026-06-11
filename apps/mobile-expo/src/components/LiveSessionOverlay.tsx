import { useFonts } from 'expo-font';
import { PTSerif_700Bold } from '@expo-google-fonts/pt-serif';
import {
  UbuntuSansMono_400Regular,
  UbuntuSansMono_600SemiBold,
  UbuntuSansMono_700Bold,
} from '@expo-google-fonts/ubuntu-sans-mono';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createMaterial,
  createNote,
  deleteMaterial,
  deleteNote,
  fetchJobDetail,
  updateMaterial,
  updateNote,
} from '@fieldbook/api-client';
import type {
  JobDetailMaterialLine,
  JobDetailNote,
  JobDetailViewModel,
} from '@fieldbook/shared-types';

import {
  ChooseSessionBottomSheet,
  DropdownBottomSheet,
  EditLiveSessionBottomSheet,
  EditMaterialBottomSheet,
  EditNoteBottomSheet,
  LiveSessionBottomSheet,
  MinimizedLiveSessionBar,
  type ChooseSessionBottomSheetSession,
  type DropdownBottomSheetOption,
  type EditMaterialBottomSheetValues,
  type EditNoteBottomSheetValues,
  type EditLiveSessionSavePayload,
} from './ds';
import {
  useBottomSheetStackWriters,
  useTopmostBottomSheet,
} from '../context/BottomSheetStackContext';
import { useLiveSession } from '../context/LiveSessionContext';
import {
  analytics,
  durationMinutesBetween,
  errorProperties,
  moneyBucket,
  quantityBucket,
  textLengthBucket,
} from '../lib/analytics';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { createTextStyles, space } from '../theme/nativeTokens';

type LiveSessionOverlayProps = {
  /**
   * Called after a live session ends or is deleted. The parent decides whether
   * to refresh an already-open Job Detail or stay on the tab shell.
   */
  onSessionEnded: (input: { jobId: string }) => void;
};

/**
 * Global Live Session UI. Mounted once at the root of `AuthenticatedShell`
 * (after the screen tree) so the floating bar / sheets always render above
 * every screen and persist across navigations.
 *
 * Renders nothing when there is no active live session.
 */
export function LiveSessionOverlay({ onSessionEnded }: LiveSessionOverlayProps) {
  const insets = useSafeAreaInsets();
  const sheetStackWriters = useBottomSheetStackWriters();
  const topmostSheet = useTopmostBottomSheet();
  const {
    liveSession,
    mode,
    minimize,
    openSheet,
    openEditSheet,
    closeEditSheet,
    minimizeFromEdit,
    endLiveSessionNow,
    updateLiveSessionStartedAt,
    deleteLiveSessionNow,
  } = useLiveSession();

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

  const [jobDetail, setJobDetail] = useState<JobDetailViewModel | null>(null);

  type NoteFlow = 'closed' | 'addNote' | 'editNote' | 'attachSession' | 'editSession';
  const [noteFlow, setNoteFlow] = useState<NoteFlow>('closed');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState('');
  const [draftSessionId, setDraftSessionId] = useState<string | null>(null);
  const [noteSaving, setNoteSaving] = useState(false);

  type MaterialFlow =
    | 'closed'
    | 'addMaterial'
    | 'editMaterial'
    | 'attachSession'
    | 'editSession'
    | 'chooseUnit';
  const [materialFlow, setMaterialFlow] = useState<MaterialFlow>('closed');
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [matDraftDescription, setMatDraftDescription] = useState('');
  const [matDraftUnitCostCents, setMatDraftUnitCostCents] = useState(0);
  const [matDraftQuantity, setMatDraftQuantity] = useState(1);
  const [matDraftUnit, setMatDraftUnit] = useState('ea');
  const [matDraftSessionId, setMatDraftSessionId] = useState<string | null>(null);
  const [materialSaving, setMaterialSaving] = useState(false);

  const refetchJobDetail = useCallback(async () => {
    if (!liveSession || !isSupabaseConfigured()) return;
    try {
      const j = await fetchJobDetail(supabase, liveSession.jobId);
      if (j) setJobDetail(j);
    } catch {
      // best-effort; attachment list may stay stale
    }
  }, [liveSession]);

  useEffect(() => {
    if (!liveSession) {
      setJobDetail(null);
      setNoteFlow('closed');
      setMaterialFlow('closed');
      return;
    }
    void refetchJobDetail();
  }, [liveSession, refetchJobDetail]);

  useEffect(() => {
    if (liveSession && mode === 'sheet') {
      void refetchJobDetail();
    }
  }, [mode, liveSession, refetchJobDetail]);

  // Note/material flows only apply to the main live sheet. Closing that layer
  // (minimize, edit live session) abandons the draft the same as navigating away.
  useEffect(() => {
    if (mode === 'minimized' || mode === 'hidden' || mode === 'editSheet') {
      setNoteFlow('closed');
      setMaterialFlow('closed');
    }
  }, [mode]);

  const jobId = liveSession?.jobId;
  const elapsedSeconds = useCallback(() => {
    if (!liveSession) return 0;
    const started = Date.parse(liveSession.startedAt);
    if (!Number.isFinite(started)) return 0;
    return Math.max(0, Math.round((Date.now() - started) / 1000));
  }, [liveSession]);

  const findNote = useCallback(
    (noteId: string): JobDetailNote | null => {
      if (!jobDetail) return null;
      for (const bucket of jobDetail.noteBuckets) {
        const hit = bucket.notes.find((n) => n.id === noteId);
        if (hit) return hit;
      }
      return null;
    },
    [jobDetail],
  );

  const findMaterial = useCallback(
    (materialId: string): JobDetailMaterialLine | null => {
      if (!jobDetail) return null;
      for (const bucket of jobDetail.materialBuckets) {
        const hit = bucket.items.find((m) => m.id === materialId);
        if (hit) return hit;
      }
      return null;
    },
    [jobDetail],
  );

  const formatErrorMessage = useCallback((e: unknown): string => {
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
  }, []);

  const allSessionsList = useMemo(
    () => jobDetail?.allSessions ?? [],
    [jobDetail?.allSessions],
  );

  const chooserSessions = useMemo<ChooseSessionBottomSheetSession[]>(
    () =>
      allSessionsList.map((s) => ({
        id: s.id,
        dateLabel: s.dateLabel,
        timeRangeLabel: s.timeRangeLabel,
      })),
    [allSessionsList],
  );

  const draftAssignedSession = useMemo(() => {
    if (!draftSessionId) return null;
    const s = allSessionsList.find((x) => x.id === draftSessionId);
    if (!s) return null;
    return { id: s.id, dateLabel: s.dateLabel, timeRangeLabel: s.timeRangeLabel };
  }, [draftSessionId, allSessionsList]);

  const matDraftAssignedSession = useMemo(() => {
    if (!matDraftSessionId) return null;
    const s = allSessionsList.find((x) => x.id === matDraftSessionId);
    if (!s) return null;
    return { id: s.id, dateLabel: s.dateLabel, timeRangeLabel: s.timeRangeLabel };
  }, [matDraftSessionId, allSessionsList]);

  const unitOptions = useMemo<DropdownBottomSheetOption[]>(
    () =>
      (['ea', 'ft', 'pcs', 'kit', 'lb', 'gal', 'lot'] as const).map((u) => ({
        id: u,
        label: u,
        value: u,
      })),
    [],
  );

  const liveAttachments = useMemo(() => {
    if (!jobDetail?.inProgressSession || !liveSession) return [];
    if (jobDetail.inProgressSession.id !== liveSession.id) return [];
    return jobDetail.inProgressSession.attachments;
  }, [jobDetail, liveSession]);

  /** Show the live session capture UI only when no note/material sub-flow (swap, not stack). */
  const showLiveSessionMain = useMemo(
    () =>
      mode === 'sheet' && noteFlow === 'closed' && materialFlow === 'closed',
    [mode, materialFlow, noteFlow],
  );

  const showNoteForm = mode === 'sheet' && (noteFlow === 'addNote' || noteFlow === 'editNote');
  const showNoteSessionPicker =
    mode === 'sheet' && (noteFlow === 'attachSession' || noteFlow === 'editSession');
  const showMaterialForm =
    mode === 'sheet' && (materialFlow === 'addMaterial' || materialFlow === 'editMaterial');
  const showMaterialSessionPicker =
    mode === 'sheet' && (materialFlow === 'attachSession' || materialFlow === 'editSession');
  const showMaterialUnitPicker = mode === 'sheet' && materialFlow === 'chooseUnit';

  const closeNoteFlow = useCallback(() => {
    setNoteFlow('closed');
  }, []);

  const openAddNoteFromLive = useCallback(() => {
    if (!liveSession) return;
    analytics.capture('note_create_opened', {
      source: 'live_session',
      parent: 'session',
      job_id: liveSession.jobId,
      session_id: liveSession.id,
    });
    setEditingNoteId(null);
    setDraftBody('');
    setDraftSessionId(liveSession.id);
    setNoteFlow('addNote');
  }, [liveSession]);

  const openEditNote = useCallback(
    (noteId: string) => {
      const n = findNote(noteId);
      if (!n) return;
      setEditingNoteId(noteId);
      setDraftBody(n.body);
      setDraftSessionId(n.sessionId);
      setNoteFlow('editNote');
    },
    [findNote],
  );

  const openSessionPickerFromNoteSheet = useCallback(() => {
    setNoteFlow(draftSessionId ? 'editSession' : 'attachSession');
  }, [draftSessionId]);

  const returnToNoteSheet = useCallback(() => {
    setNoteFlow(editingNoteId ? 'editNote' : 'addNote');
  }, [editingNoteId]);

  const onSelectDraftSession = useCallback(
    (sessionId: string) => {
      setDraftSessionId(sessionId);
      returnToNoteSheet();
    },
    [returnToNoteSheet],
  );

  const onRemoveDraftSession = useCallback(() => {
    setDraftSessionId(null);
    returnToNoteSheet();
  }, [returnToNoteSheet]);

  const onSaveNewNote = useCallback(
    async ({ body }: EditNoteBottomSheetValues) => {
      if (!jobId) return;
      setNoteSaving(true);
      try {
        const noteId = await createNote(supabase, {
          jobId,
          sessionId: draftSessionId,
          body,
        });
        await refetchJobDetail();
        closeNoteFlow();
        analytics.capture('note_created', {
          source: 'live_session',
          note_id: noteId,
          parent_type: draftSessionId ? 'session' : 'job',
          job_id: jobId,
          session_id: draftSessionId,
          text_length_bucket: textLengthBucket(body),
        });
      } catch (e) {
        analytics.capture('note_create_failed', {
          source: 'live_session',
          parent_type: draftSessionId ? 'session' : 'job',
          job_id: jobId,
          session_id: draftSessionId,
          ...errorProperties(e),
        });
        Alert.alert('Save failed', formatErrorMessage(e) || 'Could not save note.');
      } finally {
        setNoteSaving(false);
      }
    },
    [closeNoteFlow, draftSessionId, formatErrorMessage, jobId, refetchJobDetail],
  );

  const onSaveNoteChanges = useCallback(
    async ({ body }: EditNoteBottomSheetValues) => {
      if (!editingNoteId || !jobId) return;
      setNoteSaving(true);
      try {
        await updateNote(supabase, editingNoteId, {
          body,
          sessionId: draftSessionId,
          jobId: draftSessionId === null ? jobId : undefined,
        });
        await refetchJobDetail();
        closeNoteFlow();
      } catch (e) {
        Alert.alert('Save failed', formatErrorMessage(e) || 'Could not save note.');
      } finally {
        setNoteSaving(false);
      }
    },
    [closeNoteFlow, draftSessionId, editingNoteId, formatErrorMessage, jobId, refetchJobDetail],
  );

  const onDeleteEditingNote = useCallback(async () => {
    if (!editingNoteId) {
      closeNoteFlow();
      return;
    }
    setNoteSaving(true);
    try {
      await deleteNote(supabase, editingNoteId);
      await refetchJobDetail();
      closeNoteFlow();
    } catch (e) {
      Alert.alert('Delete failed', formatErrorMessage(e) || 'Could not delete note.');
    } finally {
      setNoteSaving(false);
    }
  }, [closeNoteFlow, editingNoteId, formatErrorMessage, refetchJobDetail]);

  const closeMaterialFlow = useCallback(() => {
    setMaterialFlow('closed');
  }, []);

  const openAddMaterialFromLive = useCallback(() => {
    if (!liveSession) return;
    analytics.capture('material_create_opened', {
      source: 'live_session',
      parent: 'session',
      job_id: liveSession.jobId,
      session_id: liveSession.id,
    });
    setEditingMaterialId(null);
    setMatDraftDescription('');
    setMatDraftUnitCostCents(0);
    setMatDraftQuantity(1);
    setMatDraftUnit('ea');
    setMatDraftSessionId(liveSession.id);
    setMaterialFlow('addMaterial');
  }, [liveSession]);

  const openEditMaterial = useCallback(
    (materialId: string) => {
      const m = findMaterial(materialId);
      if (!m) return;
      setEditingMaterialId(materialId);
      setMatDraftDescription(m.name);
      setMatDraftUnitCostCents(m.unitCostCents);
      setMatDraftQuantity(m.quantity);
      setMatDraftUnit(m.unit || 'ea');
      setMatDraftSessionId(m.sessionId);
      setMaterialFlow('editMaterial');
    },
    [findMaterial],
  );

  const returnToMaterialSheet = useCallback(() => {
    setMaterialFlow(editingMaterialId ? 'editMaterial' : 'addMaterial');
  }, [editingMaterialId]);

  const openSessionPickerFromMaterialSheet = useCallback(() => {
    setMaterialFlow(matDraftSessionId ? 'editSession' : 'attachSession');
  }, [matDraftSessionId]);

  const openUnitPickerFromMaterialSheet = useCallback(() => {
    setMaterialFlow('chooseUnit');
  }, []);

  const onSelectMaterialSession = useCallback(
    (sessionId: string) => {
      setMatDraftSessionId(sessionId);
      returnToMaterialSheet();
    },
    [returnToMaterialSheet],
  );

  const onRemoveMaterialSession = useCallback(() => {
    setMatDraftSessionId(null);
    returnToMaterialSheet();
  }, [returnToMaterialSheet]);

  const onSelectMaterialUnit = useCallback(
    (unit: string) => {
      setMatDraftUnit(unit || 'ea');
      returnToMaterialSheet();
    },
    [returnToMaterialSheet],
  );

  const onSaveNewMaterial = useCallback(
    async (values: EditMaterialBottomSheetValues) => {
      if (!jobId) return;
      setMaterialSaving(true);
      try {
        const materialId = await createMaterial(supabase, {
          jobId,
          sessionId: matDraftSessionId,
          description: values.description,
          quantity: values.quantity,
          unit: values.unit,
          unitCostCents: values.unitCostCents,
        });
        await refetchJobDetail();
        closeMaterialFlow();
        analytics.capture('material_created', {
          source: 'live_session',
          material_id: materialId,
          parent_type: matDraftSessionId ? 'session' : 'job',
          job_id: jobId,
          session_id: matDraftSessionId,
          unit: values.unit,
          quantity_bucket: quantityBucket(values.quantity),
          cost_bucket: moneyBucket(values.unitCostCents),
          text_length_bucket: textLengthBucket(values.description),
        });
      } catch (e) {
        analytics.capture('material_create_failed', {
          source: 'live_session',
          parent_type: matDraftSessionId ? 'session' : 'job',
          job_id: jobId,
          session_id: matDraftSessionId,
          ...errorProperties(e),
        });
        Alert.alert('Save failed', formatErrorMessage(e) || 'Could not save material.');
      } finally {
        setMaterialSaving(false);
      }
    },
    [closeMaterialFlow, formatErrorMessage, jobId, matDraftSessionId, refetchJobDetail],
  );

  const onSaveMaterialChanges = useCallback(
    async (values: EditMaterialBottomSheetValues) => {
      if (!editingMaterialId || !jobId) return;
      setMaterialSaving(true);
      try {
        await updateMaterial(supabase, editingMaterialId, {
          description: values.description,
          quantity: values.quantity,
          unit: values.unit,
          unitCostCents: values.unitCostCents,
          sessionId: matDraftSessionId,
          jobId: matDraftSessionId === null ? jobId : undefined,
        });
        await refetchJobDetail();
        closeMaterialFlow();
      } catch (e) {
        Alert.alert('Save failed', formatErrorMessage(e) || 'Could not save material.');
      } finally {
        setMaterialSaving(false);
      }
    },
    [
      closeMaterialFlow,
      editingMaterialId,
      formatErrorMessage,
      jobId,
      matDraftSessionId,
      refetchJobDetail],
  );

  const onDeleteEditingMaterial = useCallback(async () => {
    if (!editingMaterialId) {
      closeMaterialFlow();
      return;
    }
    setMaterialSaving(true);
    try {
      await deleteMaterial(supabase, editingMaterialId);
      await refetchJobDetail();
      closeMaterialFlow();
    } catch (e) {
      Alert.alert('Delete failed', formatErrorMessage(e) || 'Could not delete material.');
    } finally {
      setMaterialSaving(false);
    }
  }, [closeMaterialFlow, editingMaterialId, formatErrorMessage, refetchJobDetail]);

  const handleEndSession = useCallback(async () => {
    try {
      const ended = await endLiveSessionNow();
      if (ended) {
        analytics.capture('live_session_ended', {
          session_id: ended.id,
          job_id: ended.jobId,
          duration_minutes: durationMinutesBetween(ended.startedAt, new Date().toISOString()),
          source: 'end_button',
        });
        onSessionEnded({ jobId: ended.jobId });
      }
    } catch (e) {
      analytics.capture('live_session_end_failed', {
        session_id: liveSession?.id ?? null,
        job_id: liveSession?.jobId ?? null,
        ...errorProperties(e),
      });
      Alert.alert('End failed', formatErrorMessage(e) || 'Could not end session.');
    }
  }, [endLiveSessionNow, formatErrorMessage, liveSession, onSessionEnded]);

  const handleEditSave = useCallback(
    async (payload: EditLiveSessionSavePayload) => {
      if (payload.kind === 'updateStart') {
        try {
          const previousStartedAt = liveSession?.startedAt ?? payload.startedAt;
          await updateLiveSessionStartedAt({ startedAt: payload.startedAt });
          analytics.capture('live_session_start_time_changed', {
            session_id: liveSession?.id ?? null,
            job_id: liveSession?.jobId ?? null,
            delta_minutes: Math.round(
              (Date.parse(payload.startedAt) - Date.parse(previousStartedAt)) / 60000,
            ),
          });
        } finally {
          // Return to full sheet whether the network call succeeded or
          // rolled back — the user explicitly tapped Save Changes and the
          // sheet should not stay in edit mode.
          closeEditSheet();
        }
        return;
      }
      // endSession path: persist the new start (if changed), then end.
      if (liveSession && payload.startedAt !== liveSession.startedAt) {
        try {
          await updateLiveSessionStartedAt({ startedAt: payload.startedAt });
          analytics.capture('live_session_start_time_changed', {
            session_id: liveSession.id,
            job_id: liveSession.jobId,
            delta_minutes: Math.round(
              (Date.parse(payload.startedAt) - Date.parse(liveSession.startedAt)) / 60000,
            ),
          });
        } catch {
          // Surface but don't block — the more important transition is
          // ending the session per the user's intent.
        }
      }
      try {
        const ended = await endLiveSessionNow({ endedAt: payload.endedAt });
        if (ended) {
          analytics.capture('live_session_ended', {
            session_id: ended.id,
            job_id: ended.jobId,
            duration_minutes: durationMinutesBetween(ended.startedAt, payload.endedAt),
            source: 'edit_end_time',
          });
          onSessionEnded({ jobId: ended.jobId });
        }
      } catch (e) {
        analytics.capture('live_session_end_failed', {
          session_id: liveSession?.id ?? null,
          job_id: liveSession?.jobId ?? null,
          ...errorProperties(e),
        });
        Alert.alert('End failed', formatErrorMessage(e) || 'Could not end session.');
      }
    },
    [
      closeEditSheet,
      endLiveSessionNow,
      liveSession,
      onSessionEnded,
      formatErrorMessage,
      updateLiveSessionStartedAt,
    ],
  );

  const handleEditDelete = useCallback(async () => {
    try {
      const deleted = await deleteLiveSessionNow();
      if (deleted) {
        analytics.capture('live_session_deleted', {
          session_id: deleted.id,
          job_id: deleted.jobId,
          elapsed_seconds: elapsedSeconds(),
        });
        onSessionEnded({ jobId: deleted.jobId });
      }
    } catch (e) {
      analytics.capture('live_session_delete_failed', {
        session_id: liveSession?.id ?? null,
        job_id: liveSession?.jobId ?? null,
        ...errorProperties(e),
      });
      Alert.alert('Delete failed', formatErrorMessage(e) || 'Could not delete live session.');
    }
  }, [deleteLiveSessionNow, elapsedSeconds, formatErrorMessage, liveSession, onSessionEnded]);

  // Tapping the minimized bar should:
  //   1. If a foreign bottom sheet (Edit Job, etc.) is currently presented,
  //      ask it to dismiss first so the user is not left with two stacked
  //      overlays.
  //   2. Open the Live Session sheet. Both animations play simultaneously
  //      (foreign sheet slides down, live sheet slides up) which reads as
  //      a swap rather than a queued stack.
  const handleBarPress = useCallback(() => {
    analytics.capture('live_session_reopened', {
      session_id: liveSession?.id ?? null,
      job_id: liveSession?.jobId ?? null,
      elapsed_seconds: elapsedSeconds(),
      source: 'minimized_bar',
    });
    if (topmostSheet) {
      sheetStackWriters?.requestCloseTopmost();
    }
    openSheet();
  }, [elapsedSeconds, liveSession, openSheet, sheetStackWriters, topmostSheet]);

  // The bar's anchor stays pinned at `fabSlotBottom` (where it lives when
  // no foreign sheet is presented). When a foreign sheet IS presented we
  // SLIDE the bar up via an animated `translateY` so it lands just above
  // the sheet's top edge with a small gap.
  const fabSlotBottom = space('Spacing/8') + insets.bottom + 64 + space('Spacing/12');
  const stackTopY = topmostSheet?.topY ?? null;
  const liftDelta = useMemo(() => {
    if (stackTopY == null) return 0;
    const windowH = Dimensions.get('window').height;
    const liftedBottom = Math.max(0, windowH - stackTopY) + space('Spacing/12');
    return Math.max(0, liftedBottom - fabSlotBottom);
  }, [stackTopY, fabSlotBottom]);

  const liftAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const isLifting = liftDelta > 0;
    Animated.timing(liftAnim, {
      toValue: -liftDelta,
      duration: isLifting ? 280 : 220,
      easing: isLifting ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [liftAnim, liftDelta]);

  useEffect(() => {
    if (!liveSession) return;
    if (mode === 'sheet') {
      analytics.capture('live_session_viewed', {
        source: 'opened_sheet',
        session_id: liveSession.id,
        job_id: liveSession.jobId,
        elapsed_seconds: elapsedSeconds(),
      });
    } else if (mode === 'minimized') {
      analytics.capture('live_session_minimized', {
        session_id: liveSession.id,
        job_id: liveSession.jobId,
        elapsed_seconds: elapsedSeconds(),
      });
    } else if (mode === 'editSheet') {
      analytics.capture('live_session_edit_opened', {
        session_id: liveSession.id,
        job_id: liveSession.jobId,
        elapsed_seconds: elapsedSeconds(),
      });
    }
  }, [elapsedSeconds, liveSession, mode]);

  if (!fontsLoaded || !liveSession) return null;

  const barVisible = mode === 'minimized';
  /** Lift above foreign sheets (Edit Job, etc.) when they are on the global stack. */
  const barAboveForeignSheet = barVisible && topmostSheet != null;

  return (
    <>
      {/*
        Sheet stack: both BottomSheetShells stay mounted so they can play
        their slide-down animation — visibility flips drive the slide.
      */}
      <LiveSessionBottomSheet
        typography={typography}
        visible={showLiveSessionMain}
        jobShortDescription={liveSession.jobShortDescription}
        startedAt={liveSession.startedAt}
        attachments={liveAttachments}
        onAddNote={openAddNoteFromLive}
        onAddMaterial={openAddMaterialFromLive}
        onPressAttachment={({ kind, id }) => {
          if (kind === 'note') {
            openEditNote(id);
          } else {
            openEditMaterial(id);
          }
        }}
        onMinimize={minimize}
        onEditPress={openEditSheet}
        onEndSessionPress={() => void handleEndSession()}
      />

      <EditLiveSessionBottomSheet
        typography={typography}
        visible={mode === 'editSheet'}
        startedAt={liveSession.startedAt}
        // Per spec: tapping outside / swiping the edit sheet down should
        // MINIMIZE the live session (not just go back to the full sheet).
        onClose={minimizeFromEdit}
        onBack={closeEditSheet}
        onSavePress={(payload) => void handleEditSave(payload)}
        onDeletePress={() => void handleEditDelete()}
      />

      {/*
        Note / material + pickers: swap into the same modal layer as the live
        session sheet (same idea as `mode === 'editSheet'` vs `sheet` for
        Edit Live). No second scrim on top of the live session.
      */}
      <EditNoteBottomSheet
        typography={typography}
        visible={showNoteForm}
        title={editingNoteId ? 'Edit Note' : 'Add Note'}
        primaryLabel={editingNoteId ? 'SAVE CHANGES' : 'SAVE NEW NOTE'}
        values={{ body: draftBody }}
        assignedSession={draftAssignedSession}
        canAttachSession={chooserSessions.length > 0}
        registerInGlobalStack={false}
        onClose={closeNoteFlow}
        onBack={closeNoteFlow}
        onSavePress={(values) => {
          if (noteSaving) return;
          if (editingNoteId) {
            void onSaveNoteChanges(values);
          } else {
            void onSaveNewNote(values);
          }
        }}
        onDeletePress={() => {
          if (noteSaving) return;
          void onDeleteEditingNote();
        }}
        onSessionPillPress={(values) => {
          setDraftBody(values.body);
          openSessionPickerFromNoteSheet();
        }}
      />
      <ChooseSessionBottomSheet
        typography={typography}
        visible={showNoteSessionPicker}
        mode={noteFlow === 'editSession' ? 'edit' : 'attach'}
        sessions={chooserSessions}
        currentSessionId={draftSessionId}
        registerInGlobalStack={false}
        onClose={closeNoteFlow}
        onBack={returnToNoteSheet}
        onSelect={onSelectDraftSession}
        onRemove={onRemoveDraftSession}
      />
      <EditMaterialBottomSheet
        typography={typography}
        visible={showMaterialForm}
        title={editingMaterialId ? 'Edit Material' : 'Add Material'}
        primaryLabel={editingMaterialId ? 'SAVE CHANGES' : 'SAVE NEW MATERIAL'}
        values={{
          description: matDraftDescription,
          unitCostCents: matDraftUnitCostCents,
          quantity: matDraftQuantity,
          unit: matDraftUnit,
        }}
        assignedSession={matDraftAssignedSession}
        canAttachSession={chooserSessions.length > 0}
        registerInGlobalStack={false}
        onClose={closeMaterialFlow}
        onBack={closeMaterialFlow}
        onSavePress={(values) => {
          if (materialSaving) return;
          setMatDraftDescription(values.description);
          setMatDraftUnitCostCents(values.unitCostCents);
          setMatDraftQuantity(values.quantity);
          setMatDraftUnit(values.unit);
          if (editingMaterialId) {
            void onSaveMaterialChanges(values);
          } else {
            void onSaveNewMaterial(values);
          }
        }}
        onDeletePress={() => {
          if (materialSaving) return;
          void onDeleteEditingMaterial();
        }}
        onSessionPillPress={(values) => {
          setMatDraftDescription(values.description);
          setMatDraftUnitCostCents(values.unitCostCents);
          setMatDraftQuantity(values.quantity);
          setMatDraftUnit(values.unit);
          openSessionPickerFromMaterialSheet();
        }}
        onUnitPress={(values) => {
          setMatDraftDescription(values.description);
          setMatDraftUnitCostCents(values.unitCostCents);
          setMatDraftQuantity(values.quantity);
          setMatDraftUnit(values.unit);
          openUnitPickerFromMaterialSheet();
        }}
      />
      <ChooseSessionBottomSheet
        typography={typography}
        visible={showMaterialSessionPicker}
        mode={materialFlow === 'editSession' ? 'edit' : 'attach'}
        sessions={chooserSessions}
        currentSessionId={matDraftSessionId}
        registerInGlobalStack={false}
        onClose={closeMaterialFlow}
        onBack={returnToMaterialSheet}
        onSelect={onSelectMaterialSession}
        onRemove={onRemoveMaterialSession}
      />
      <DropdownBottomSheet
        typography={typography}
        visible={showMaterialUnitPicker}
        options={unitOptions}
        currentValue={matDraftUnit}
        allowCustom
        customPlaceholder="Custom"
        registerInGlobalStack={false}
        onClose={closeMaterialFlow}
        onBack={returnToMaterialSheet}
        onSelect={onSelectMaterialUnit}
      />

      {/*
        Bar stays mounted whenever a live session exists, so the morph
        between full sheet ↔ bar is a smooth crossfade rather than a
        mount/unmount jolt. `visible` drives the bar's internal
        opacity/translate/scale animation.
      */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.minimizedAnchor,
          barVisible && styles.minimizedAnchorRaised,
          barAboveForeignSheet && styles.minimizedAnchorAboveSheet,
          { bottom: fabSlotBottom, transform: [{ translateY: liftAnim }] },
        ]}
      >
        <MinimizedLiveSessionBar
          typography={typography}
          visible={barVisible}
          jobShortDescription={liveSession.jobShortDescription}
          startedAt={liveSession.startedAt}
          onPress={handleBarPress}
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  minimizedAnchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: space('Spacing/16'),
  },
  minimizedAnchorRaised: {
    zIndex: 30,
    elevation: 12,
  },
  minimizedAnchorAboveSheet: {
    zIndex: 1100,
    elevation: 1100,
  },
});
