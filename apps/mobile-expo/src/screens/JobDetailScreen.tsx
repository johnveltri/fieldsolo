/**
 * Job detail screen — single job: header, earnings, CTAs, metrics, sessions, materials, notes.
 *
 * **Layout:** Full-screen `CanvasTiledBackground` → `ScrollView` (transparent so the lined canvas shows in gutters)
 * → optional fixed `BottomNavJobs` pinned to the bottom (outside the scroll so it stays visible).
 *
 * **Width:** Content uses `CONTENT_MAX_WIDTH` / `TOP_HEADER_MAX_WIDTH` so phones scale edge-to-edge (minus padding)
 * while wide layouts cap at the Figma frame (~393pt).
 *
 * **Typography:** `createTextStyles` maps `typography.json` roles to loaded Expo fonts (see `nativeTokens.ts`).
 * **Money:** `formatUsdCombined` in `lib/formatUsd.ts` + `JobDetailSummaryCard` use DS color tokens for tones.
 */
import { useFonts } from 'expo-font';
import { PTSerif_700Bold } from '@expo-google-fonts/pt-serif';
import {
  UbuntuSansMono_400Regular,
  UbuntuSansMono_600SemiBold,
  UbuntuSansMono_700Bold,
} from '@expo-google-fonts/ubuntu-sans-mono';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  ChooseSessionBottomSheet,
  DropdownBottomSheet,
  EditJobBottomSheet,
  EditMaterialBottomSheet,
  EditNoteBottomSheet,
  EditSessionBottomSheet,
  JobDetailCtaRow,
  JobDetailJobHeader,
  JobDetailMetricTertiary,
  JobDetailSummaryCard,
  NewSessionBottomSheet,
  nextStatusAfterPrimaryAction,
  SessionCard,
  ViewMaterialsBuckets,
  ViewNotesBuckets,
  type ChooseSessionBottomSheetSession,
  type DropdownBottomSheetOption,
  type EditMaterialBottomSheetValues,
  type EditNoteBottomSheetValues,
  type EditSessionBottomSheetValues,
} from '../components/ds';
import { CanvasTiledBackground } from '../components/CanvasTiledBackground';
import {
  ShellBottomNav,
  shellBottomNavOuterHeight,
  type ShellMainTab,
} from '../components/shell/ShellBottomNav';
import {
  JobDetailIconCtaMore,
  JobDetailIconSectionAdd,
  JobDetailIconSectionMaterials,
  JobDetailIconSectionNotes,
  JobDetailIconSectionSessions,
  JobDetailIconTopClose,
  JobDetailIconTopEdit,
} from '../components/figma-icons/JobDetailScreenIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, colorWithAlpha, radius } from '@fieldbook/design-system/lib/tokens';
import {
  createManualSession,
  createMaterial,
  createNote,
  deleteMaterial,
  deleteNote,
  deleteSession,
  deleteJobById,
  fetchFirstJobIdForCurrentUser,
  fetchJobDetail,
  updateJobById,
  updateJobNoMaterialsConfirmed,
  isNoMaterialsConfirmedColumnMissingError,
  updateJobStatusById,
  updateMaterial,
  updateNote,
  updateSessionTimes,
} from '@fieldbook/api-client';
import type {
  JobDetailMaterialLine,
  JobDetailNote,
  JobDetailSession,
  JobDetailViewModel,
  JobDetailWorkStatus,
} from '@fieldbook/shared-types';

import { useJobsListInvalidation } from '../context/JobsListInvalidationContext';
import { isStaleJwtError, useLiveSession } from '../context/LiveSessionContext';
import {
  buildJobStatusSheetOptions,
  isJobDetailWorkStatus,
} from '../lib/jobStatusSheet';
import {
  analytics,
  changedFields,
  durationMinutesBetween,
  errorProperties,
  moneyBucket,
  quantityBucket,
  textLengthBucket,
} from '../lib/analytics';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
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
import type { TextStyles } from '../theme/nativeTokens';
import type { EditJobBottomSheetValues } from '../components/ds/EditJobBottomSheet';

/** Vertical gap between stacked blocks in the main column (`Spacing/20` = 16 + 4). */
const SLOT_GAP = space('Spacing/20');

function supabaseApiHostLabel(): string {
  const u = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  try {
    return new URL(u).host || u;
  } catch {
    return u.length > 48 ? `${u.slice(0, 48)}…` : u;
  }
}

function jobDetailIsFinanciallyComplete(job: JobDetailViewModel): boolean {
  const hasMaterials = job.materialBuckets.some((bucket) => bucket.items.length > 0);
  return (
    job.earnings.revenueCents > 0 &&
    job.metrics.sessionCount > 0 &&
    (hasMaterials || job.noMaterialsConfirmed)
  );
}

export type JobDetailScreenProps = {
  /** Top-left close (X): return to the tab shell (HOME / JOBS / EARNINGS). */
  onRequestClose?: () => void;
  /**
   * Tab nav handler — closes Job Detail and switches the parent shell to the
   * tapped tab (HOME / JOBS / EARNINGS). Owned by the parent because Job
   * Detail covers the shell entirely while open and needs the parent to flip
   * `mainTab` + dismiss this screen in one update.
   */
  onSelectShellTab?: (tab: ShellMainTab) => void;
  /** Signed-in user (refetch job list when this changes). */
  sessionUserId?: string | null;
  sessionEmail?: string | null;
  /** Optional explicit job id to load (used by Jobs screen card taps / new job). */
  jobId?: string | null;
  /** Analytics source for the navigation that opened this detail view. */
  entrySource?: string;
  /** Parent increments when navigating to this screen (e.g. "View job") to force reload. */
  loadKey?: number;
  /** When true, open the edit job sheet once after the job finishes loading (e.g. new job FAB). */
  initialEditOpen?: boolean;
};

export function JobDetailScreen({
  onRequestClose,
  onSelectShellTab,
  sessionUserId,
  sessionEmail,
  jobId,
  entrySource = 'unknown',
  loadKey = 0,
  initialEditOpen = false,
}: JobDetailScreenProps = {}) {
  /** Top safe area (status bar); bottom inset used for scroll padding + nav. */
  const insets = useSafeAreaInsets();
  const scrollY = useMemo(() => new Animated.Value(0), []);
  /**
   * Height of the scrollable content, reported via the scrollview's
   * `onContentSizeChange`. Passed to `CanvasTiledBackground` so the ruled
   * layer covers the entire scroll height — otherwise the lines + cream
   * fill run out below one viewport and expose the root bg.
   */
  const [scrollContentHeight, setScrollContentHeight] = useState(0);

  /** Load DS fonts before rendering text (avoids flash of system font / layout jump). */
  const [fontsLoaded] = useFonts({
    PTSerif_700Bold,
    UbuntuSansMono_400Regular,
    UbuntuSansMono_600SemiBold,
    UbuntuSansMono_700Bold,
  });

  /** Memoized text style bundle (serif headings + mono body) tied to loaded font postscript names. */
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

  const supabaseReady = isSupabaseConfigured();
  const [job, setJob] = useState<JobDetailViewModel | null>(null);
  const [jobLoading, setJobLoading] = useState(supabaseReady);
  const [jobSaving, setJobSaving] = useState(false);
  const [editSheetMounted, setEditSheetMounted] = useState(false);
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [statusSheetMounted, setStatusSheetMounted] = useState(false);
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);
  const [statusActionPending, setStatusActionPending] = useState(false);

  /** State machine for the session add/edit flow. */
  type SessionFlow = 'closed' | 'chooser' | 'addForm' | 'editForm';
  const [sessionFlow, setSessionFlow] = useState<SessionFlow>('closed');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  /** Which session card (by id) is expanded; only one at a time. */
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  /** Mount flag lets BottomSheetShell play its exit animation before unmounting. */
  const [sessionSheetMounted, setSessionSheetMounted] = useState(false);
  const [sessionSaving, setSessionSaving] = useState(false);

  /**
   * State machine for the note add/edit flow. Mirrors the session flow:
   * - `addNote` / `editNote` — the EditNoteBottomSheet.
   * - `attachSession` / `editSession` — the ChooseSessionBottomSheet,
   *   reachable from the note sheet via the `+SESSION` / pencil pill.
   */
  type NoteFlow = 'closed' | 'addNote' | 'editNote' | 'attachSession' | 'editSession';
  const [noteFlow, setNoteFlow] = useState<NoteFlow>('closed');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState('');
  const [draftSessionId, setDraftSessionId] = useState<string | null>(null);
  const [noteSheetMounted, setNoteSheetMounted] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);

  /**
   * State machine for the material add/edit flow. Mirrors the note flow with
   * an extra `chooseUnit` state for the unit-of-measure dropdown:
   * - `addMaterial` / `editMaterial` — the EditMaterialBottomSheet.
   * - `attachSession` / `editSession` — the ChooseSessionBottomSheet.
   * - `chooseUnit` — the DropdownBottomSheet.
   */
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
  const [materialSheetMounted, setMaterialSheetMounted] = useState(false);
  const [materialSaving, setMaterialSaving] = useState(false);
  const [noMaterialsSaving, setNoMaterialsSaving] = useState(false);
  /** Set when Supabase is configured but fetch returns null or throws (no silent mock). */
  const [jobLoadError, setJobLoadError] = useState<string | null>(null);
  /** Ensures we only auto-open the edit sheet once per navigation (see `initialEditOpen`). */
  const autoEditOpenedRef = useRef(false);

  useEffect(() => {
    autoEditOpenedRef.current = false;
  }, [loadKey, jobId]);

  useEffect(() => {
    if (!initialEditOpen || jobLoading || !job || autoEditOpenedRef.current) return;
    autoEditOpenedRef.current = true;
    setEditSheetMounted(true);
    setEditSheetVisible(true);
  }, [initialEditOpen, jobLoading, job]);

  useEffect(() => {
    if (!supabaseReady) {
      setJobLoading(false);
      setJob(null);
      setJobLoadError(
        'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
      );
      return;
    }
    let cancelled = false;

    const load = async () => {
      setJobLoading(true);
      setJobLoadError(null);
      try {
        const resolvedJobId = jobId ?? (await fetchFirstJobIdForCurrentUser(supabase));
        if (cancelled) return;
        if (!resolvedJobId) {
          setJob(null);
          setJobLoadError('No jobs yet.');
          return;
        }

        const j = await fetchJobDetail(supabase, resolvedJobId);
        if (cancelled) return;
        if (j) {
          setJob(j);
          analytics.capture('job_detail_opened', {
            source: entrySource,
            job_id: j.id,
            job_status: j.workStatus,
            financially_complete: jobDetailIsFinanciallyComplete(j),
            has_sessions: j.displaySessions.length > 0,
            has_materials: j.materialBuckets.some((b) => b.items.length > 0),
            has_notes: j.noteBuckets.some((b) => b.notes.length > 0),
            job_short_description: j.shortDescription,
            customer_name: j.customerName,
          });
        } else {
          setJob(null);
          setJobLoadError('Could not load that job.');
        }
      } catch (e) {
        if (!cancelled) {
          setJob(null);
          setJobLoadError(e instanceof Error ? e.message : 'Could not load job.');
          analytics.capture('api_request_failed', {
            operation: 'fetch_job_detail',
            screen: 'job_detail',
            job_id: jobId ?? null,
            retryable: true,
            ...errorProperties(e),
          });
        }
      } finally {
        if (!cancelled) setJobLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [entrySource, initialEditOpen, supabaseReady, sessionUserId, loadKey, jobId]);

  const onClose = useCallback(() => {
    onRequestClose?.();
  }, [onRequestClose]);
  const onEdit = useCallback(() => {
    if (job) {
      analytics.capture('job_edit_opened', {
        source: 'job_detail',
        job_id: job.id,
        existing_completeness: jobDetailIsFinanciallyComplete(job) ? 'complete' : 'incomplete',
        job_status: job.workStatus,
      });
    }
    setEditSheetMounted(true);
    setEditSheetVisible(true);
  }, [job]);
  const onCloseEditSheet = useCallback(() => {
    setEditSheetVisible(false);
  }, []);

  const toEditValues = useCallback((j: JobDetailViewModel): EditJobBottomSheetValues => {
    const revenue = (j.earnings.revenueCents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return {
      shortDescription: j.shortDescription,
      customerName: j.customerName,
      serviceAddress: j.serviceAddress,
      revenue,
      jobType: j.jobType,
    };
  }, []);

  const onSaveJobSheet = useCallback(
    async (values: EditJobBottomSheetValues) => {
      if (!job) return;
      const trimmedRevenue = values.revenue.trim().replace(/[$,\s]/g, '');
      const revenueCents =
        trimmedRevenue.length === 0 ? null : Math.round(Number(trimmedRevenue) * 100);

      setJobSaving(true);
      try {
        const before = toEditValues(job);
        await updateJobById(supabase, job.id, {
          shortDescription: values.shortDescription,
          customerName: values.customerName.trim(),
          serviceAddress: values.serviceAddress.trim(),
          revenueCents,
          jobType: values.jobType.trim(),
        });
        const refreshed = await fetchJobDetail(supabase, job.id);
        if (refreshed) setJob(refreshed);
        onCloseEditSheet();
        analytics.capture('job_saved', {
          job_id: job.id,
          changed_fields: changedFields(before, values),
          completeness_before: jobDetailIsFinanciallyComplete(job) ? 'complete' : 'incomplete',
          completeness_after:
            refreshed && jobDetailIsFinanciallyComplete(refreshed) ? 'complete' : 'incomplete',
          revenue_bucket: moneyBucket(revenueCents),
          job_short_description: values.shortDescription,
          customer_name: values.customerName,
        });
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : typeof e === 'object' &&
                e !== null &&
                'message' in e &&
                typeof (e as { message: unknown }).message === 'string'
              ? (e as { message: string }).message
            : String(e);
        analytics.capture('job_save_failed', {
          job_id: job.id,
          changed_fields: changedFields(toEditValues(job), values),
          ...errorProperties(e),
        });
        Alert.alert('Save failed', msg || 'Could not save job changes.');
      } finally {
        setJobSaving(false);
      }
    },
    [job, onCloseEditSheet, toEditValues],
  );

  // --- Session add/edit flow ---

  const openSessionChooser = useCallback(() => {
    if (job) analytics.capture('manual_session_create_opened', { job_id: job.id });
    setSessionSheetMounted(true);
    setSessionFlow('chooser');
    setEditingSessionId(null);
  }, [job]);

  const closeSessionFlow = useCallback(() => {
    setSessionFlow('closed');
  }, []);

  const openAddSession = useCallback(() => {
    setSessionFlow('addForm');
  }, []);

  // --- Live session integration ---

  const liveSessionCtx = useLiveSession();
  const { invalidateJobsList } = useJobsListInvalidation();
  const liveSessionForThisJob =
    liveSessionCtx.liveSession?.jobId === job?.id ? liveSessionCtx.liveSession : null;

  // Push job-rename updates into the live-session context so the floating
  // bar / live-session sheet re-render with the new title without waiting
  // for an app reload. Fires when:
  //   - There is a live session AND it's for THIS job.
  //   - The job's shortDescription differs from the cached title in the
  //     live session payload.
  // The context method itself is a no-op in any of those cases too, so
  // this effect is safe to fire on every job update.
  // Pull the function reference out so this effect doesn't re-run every
  // time the context value re-mints (mode flips, timer ticks, etc.).
  const updateLiveJobName = liveSessionCtx.updateLiveSessionJobShortDescription;
  useEffect(() => {
    if (!job) return;
    updateLiveJobName({
      jobId: job.id,
      jobShortDescription: job.shortDescription,
    });
  }, [job?.id, job?.shortDescription, updateLiveJobName]);

  /**
   * "Live Session" tile on the New Session chooser (Figma `1286:602`):
   * starts a brand new in-progress session for THIS job and immediately
   * opens the global LiveSessionBottomSheet via `LiveSessionContext`.
   *
   * Fails (without opening anything) when the user already has an
   * in-progress session — we surface a brief alert and refresh the
   * context so the existing session's floating bar reappears if it
   * was missed.
   */
  const onStartLiveSession = useCallback(async () => {
    if (!job) return;
    closeSessionFlow();
    analytics.capture('session_start_requested', {
      source: 'job_detail',
      job_id: job.id,
      placeholder_job: false,
    });
    // eslint-disable-next-line no-console
    console.log('[LiveSession] startLiveSession requested', {
      jobId: job.id,
      jobShortDescription: job.shortDescription,
    });
    try {
      const created = await liveSessionCtx.startLiveSession({
        jobId: job.id,
        jobShortDescription: job.shortDescription,
      });
      analytics.capture('live_session_started', {
        source: 'job_detail',
        session_id: created.id,
        job_id: job.id,
        job_status: job.workStatus,
        job_short_description: job.shortDescription,
        placeholder_job: false,
      });
      // eslint-disable-next-line no-console
      console.log('[LiveSession] startLiveSession success', created);
    } catch (err) {
      // Inspect the underlying Supabase error shape (PG code lives on
      // `.code`, with `.message` / `.details` usually carrying the raw
      // SQLSTATE text). Fall back to `.message` for plain Errors.
      const errorObj = (err ?? {}) as {
        code?: string;
        message?: string;
        details?: string;
        hint?: string;
      };
      const code = typeof errorObj.code === 'string' ? errorObj.code : '';
      const message =
        typeof errorObj.message === 'string'
          ? errorObj.message
          : err instanceof Error
            ? err.message
            : 'Could not start live session.';

      // Stale JWT (typically after a `supabase db reset` wiped auth.users
      // while the device still holds the old token): the LiveSessionContext
      // will sign the user out on the next refresh — just skip the
      // misleading "Could not start live session" alert and don't pollute
      // dev logs.
      if (isStaleJwtError(err)) {
        analytics.capture('stale_auth_session_detected', {
          source_operation: 'start_live_session',
          recovery_action: 'refresh_live_session',
        });
        void liveSessionCtx.refresh();
        return;
      }

      // eslint-disable-next-line no-console
      console.error('[LiveSession] startLiveSession failed', { code, message, err });

      // PG 23505 = unique_violation. Could be either:
      //   - sessions_one_active_per_user_idx (the new per-user index) — in
      //     this case the user already has an active session, so we just
      //     refresh and surface IT.
      //   - sessions_one_active_per_job_idx (pre-existing per-job index)
      //     hit by a stale row that doesn't belong to this user — in this
      //     case refresh comes up empty and we MUST tell the user instead
      //     of going silent.
      if (code === '23505' || message.includes('23505')) {
        const recovered = await liveSessionCtx.refresh();
        if (recovered) {
          analytics.capture('live_session_start_failed', {
            source: 'job_detail',
            job_id: job.id,
            placeholder_job: false,
            recovery_result: 'recovered_existing_live_session',
            ...errorProperties(err),
          });
          return; // bar / sheet will appear via context update
        }
        analytics.capture('live_session_start_failed', {
          source: 'job_detail',
          job_id: job.id,
          placeholder_job: false,
          recovery_result: 'stale_job_live_session',
          ...errorProperties(err),
        });
        Alert.alert(
          'Could not start live session',
          'A previous in-progress session for this job is still open in the database (likely a stale row). Open it and end it before starting a new one, or contact support.',
        );
        return;
      }

      const detail = [message, errorObj.details, errorObj.hint]
        .filter((s): s is string => typeof s === 'string' && s.length > 0)
        .join('\n');
      Alert.alert(
        'Could not start live session',
        detail.length > 0 ? detail : 'Unknown error.',
      );
      analytics.capture('live_session_start_failed', {
        source: 'job_detail',
        job_id: job.id,
        placeholder_job: false,
        recovery_result: 'none',
        ...errorProperties(err),
      });
    }
  }, [closeSessionFlow, job, liveSessionCtx]);

  /**
   * Re-fetch the job detail whenever the live session for THIS job ends
   * (transitions from non-null → null). The newly-ended session needs to
   * appear as a past session card; the API filters out in-progress rows
   * so this is a clean "render the new past session" trigger.
   */
  const previousLiveIdForThisJob = useRef<string | null>(null);
  useEffect(() => {
    if (!job) return;
    const currentId = liveSessionForThisJob?.id ?? null;
    const previousId = previousLiveIdForThisJob.current;
    previousLiveIdForThisJob.current = currentId;
    if (previousId && !currentId) {
      void (async () => {
        try {
          const refreshed = await fetchJobDetail(supabase, job.id);
          if (refreshed) setJob(refreshed);
        } catch {
          // best-effort refresh; user can pull-to-refresh / re-open
        }
      })();
    }
  }, [job, liveSessionForThisJob]);

  const openEditSession = useCallback((sessionId: string) => {
    setEditingSessionId(sessionId);
    setSessionSheetMounted(true);
    setSessionFlow('editForm');
  }, []);

  const editingSession = useMemo<JobDetailSession | null>(() => {
    if (!editingSessionId || !job) return null;
    return job.displaySessions.find((s) => s.id === editingSessionId) ?? null;
  }, [editingSessionId, job]);

  const refetchJob = useCallback(async () => {
    if (!job) return;
    const refreshed = await fetchJobDetail(supabase, job.id);
    if (refreshed) setJob(refreshed);
  }, [job]);

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

  const closeStatusSheet = useCallback(() => {
    setStatusSheetVisible(false);
  }, []);

  const openStatusSheet = useCallback(() => {
    setStatusSheetMounted(true);
    setStatusSheetVisible(true);
  }, []);

  const jobStatusSheetOptions = useMemo<DropdownBottomSheetOption[]>(
    () => buildJobStatusSheetOptions(),
    [],
  );

  const onPrimaryStatusCta = useCallback(async () => {
    if (!job || statusActionPending) return;
    const next = nextStatusAfterPrimaryAction(job.workStatus);
    setStatusActionPending(true);
    try {
      await updateJobStatusById(supabase, job.id, next);
      await refetchJob();
      analytics.capture('job_status_changed', {
        job_id: job.id,
        from_status: job.workStatus,
        to_status: next,
        source: 'primary_cta',
      });
    } catch (e) {
      analytics.capture('job_status_change_failed', {
        job_id: job.id,
        from_status: job.workStatus,
        attempted_status: next,
        source: 'primary_cta',
        ...errorProperties(e),
      });
      Alert.alert(
        'Update failed',
        formatErrorMessage(e) || 'Could not update job status.',
      );
    } finally {
      setStatusActionPending(false);
    }
  }, [job, statusActionPending, refetchJob, formatErrorMessage]);

  const onSelectJobStatusFromSheet = useCallback(
    async (value: string) => {
      if (!job || statusActionPending) return;
      if (!isJobDetailWorkStatus(value)) return;
      const next = value;
      setStatusActionPending(true);
      try {
        await updateJobStatusById(supabase, job.id, next);
        await refetchJob();
        closeStatusSheet();
        analytics.capture('job_status_changed', {
          job_id: job.id,
          from_status: job.workStatus,
          to_status: next,
          source: 'status_sheet',
        });
      } catch (e) {
        analytics.capture('job_status_change_failed', {
          job_id: job.id,
          from_status: job.workStatus,
          attempted_status: next,
          source: 'status_sheet',
          ...errorProperties(e),
        });
        Alert.alert(
          'Update failed',
          formatErrorMessage(e) || 'Could not update job status.',
        );
      } finally {
        setStatusActionPending(false);
      }
    },
    [job, statusActionPending, refetchJob, formatErrorMessage, closeStatusSheet],
  );

  const onSaveNewSession = useCallback(
    async (values: EditSessionBottomSheetValues) => {
      if (!job) return;
      setSessionSaving(true);
      try {
        const sessionId = await createManualSession(supabase, {
          jobId: job.id,
          startedAt: values.startedAt,
          endedAt: values.endedAt,
        });
        await refetchJob();
        invalidateJobsList();
        closeSessionFlow();
        analytics.capture('manual_session_created', {
          job_id: job.id,
          session_id: sessionId,
          duration_minutes: durationMinutesBetween(values.startedAt, values.endedAt),
        });
      } catch (e) {
        analytics.capture('manual_session_create_failed', {
          job_id: job.id,
          ...errorProperties(e),
        });
        Alert.alert('Save failed', formatErrorMessage(e) || 'Could not save session.');
      } finally {
        setSessionSaving(false);
      }
    },
    [closeSessionFlow, formatErrorMessage, invalidateJobsList, job, refetchJob],
  );

  const onSaveSessionChanges = useCallback(
    async (values: EditSessionBottomSheetValues) => {
      if (!editingSessionId) return;
      setSessionSaving(true);
      try {
        const previous = editingSession;
        await updateSessionTimes(supabase, editingSessionId, {
          startedAt: values.startedAt,
          endedAt: values.endedAt,
        });
        await refetchJob();
        invalidateJobsList();
        closeSessionFlow();
        analytics.capture('manual_session_updated', {
          session_id: editingSessionId,
          job_id: job?.id ?? null,
          changed_fields: changedFields(
            {
              startedAt: previous?.startedAt,
              endedAt: previous?.endedAt,
            },
            values,
          ),
          duration_delta_minutes:
            previous?.startedAt && previous?.endedAt
              ? durationMinutesBetween(values.startedAt, values.endedAt) -
                durationMinutesBetween(previous.startedAt, previous.endedAt)
              : null,
        });
      } catch (e) {
        analytics.capture('manual_session_update_failed', {
          session_id: editingSessionId,
          job_id: job?.id ?? null,
          ...errorProperties(e),
        });
        Alert.alert('Save failed', formatErrorMessage(e) || 'Could not save session.');
      } finally {
        setSessionSaving(false);
      }
    },
    [
      closeSessionFlow,
      editingSession,
      editingSessionId,
      formatErrorMessage,
      invalidateJobsList,
      job?.id,
      refetchJob,
    ],
  );

  const onDeleteEditingSession = useCallback(async () => {
    if (!editingSessionId) return;
    setSessionSaving(true);
    try {
      await deleteSession(supabase, editingSessionId);
      await refetchJob();
      invalidateJobsList();
      closeSessionFlow();
      analytics.capture('session_deleted', {
        session_id: editingSessionId,
        job_id: job?.id ?? null,
      });
    } catch (e) {
      analytics.capture('session_delete_failed', {
        session_id: editingSessionId,
        job_id: job?.id ?? null,
        ...errorProperties(e),
      });
      Alert.alert('Delete failed', formatErrorMessage(e) || 'Could not delete session.');
    } finally {
      setSessionSaving(false);
    }
  }, [closeSessionFlow, editingSessionId, formatErrorMessage, invalidateJobsList, job?.id, refetchJob]);

  // --- Note add/edit flow ---

  /** Find a note across all buckets by id (used when opening Edit Note from a tap). */
  const findNote = useCallback(
    (noteId: string): JobDetailNote | null => {
      if (!job) return null;
      for (const bucket of job.noteBuckets) {
        const hit = bucket.notes.find((n) => n.id === noteId);
        if (hit) return hit;
      }
      return null;
    },
    [job],
  );

  const closeNoteFlow = useCallback(() => {
    setNoteFlow('closed');
  }, []);

  const openAddNote = useCallback(() => {
    if (job) {
      analytics.capture('note_create_opened', {
        source: 'job_detail',
        parent: 'job',
        job_id: job.id,
      });
    }
    setEditingNoteId(null);
    setDraftBody('');
    setDraftSessionId(null);
    setNoteSheetMounted(true);
    setNoteFlow('addNote');
  }, [job]);

  const openAddNoteForSession = useCallback((sessionId: string) => {
    if (job) {
      analytics.capture('note_create_opened', {
        source: 'job_detail',
        parent: 'session',
        job_id: job.id,
        session_id: sessionId,
      });
    }
    setEditingNoteId(null);
    setDraftBody('');
    setDraftSessionId(sessionId);
    setNoteSheetMounted(true);
    setNoteFlow('addNote');
  }, [job]);

  const openEditNote = useCallback(
    (noteId: string) => {
      const n = findNote(noteId);
      if (!n) return;
      setEditingNoteId(noteId);
      setDraftBody(n.body);
      setDraftSessionId(n.sessionId);
      setNoteSheetMounted(true);
      setNoteFlow('editNote');
    },
    [findNote],
  );

  const openSessionPickerFromNoteSheet = useCallback(() => {
    // Edit mode when the note already has a session, attach mode otherwise.
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
      if (!job) return;
      setNoteSaving(true);
      try {
        // Exactly one of jobId / sessionId is set (notes_exactly_one_parent).
        const noteId = await createNote(supabase, {
          jobId: job.id,
          sessionId: draftSessionId,
          body,
        });
        await refetchJob();
        closeNoteFlow();
        analytics.capture('note_created', {
          source: 'job_detail',
          note_id: noteId,
          parent_type: draftSessionId ? 'session' : 'job',
          job_id: job.id,
          session_id: draftSessionId,
          text_length_bucket: textLengthBucket(body),
        });
      } catch (e) {
        analytics.capture('note_create_failed', {
          source: 'job_detail',
          parent_type: draftSessionId ? 'session' : 'job',
          job_id: job.id,
          session_id: draftSessionId,
          ...errorProperties(e),
        });
        Alert.alert('Save failed', formatErrorMessage(e) || 'Could not save note.');
      } finally {
        setNoteSaving(false);
      }
    },
    [closeNoteFlow, draftSessionId, formatErrorMessage, job, refetchJob],
  );

  const onSaveNoteChanges = useCallback(
    async ({ body }: EditNoteBottomSheetValues) => {
      if (!editingNoteId || !job) return;
      setNoteSaving(true);
      try {
        const previous = findNote(editingNoteId);
        // Pass sessionId unconditionally so the api-client re-parents to the
        // current draft assignment (including `null` → back to unassigned).
        await updateNote(supabase, editingNoteId, {
          body,
          sessionId: draftSessionId,
          jobId: draftSessionId === null ? job.id : undefined,
        });
        await refetchJob();
        closeNoteFlow();
        analytics.capture('note_updated', {
          note_id: editingNoteId,
          job_id: job.id,
          session_id: draftSessionId,
          changed_fields: changedFields(
            {
              body: previous?.body ?? '',
              sessionId: previous?.sessionId ?? null,
            },
            {
              body,
              sessionId: draftSessionId,
            },
          ),
          parent_changed: (previous?.sessionId ?? null) !== draftSessionId,
          text_length_bucket: textLengthBucket(body),
        });
      } catch (e) {
        analytics.capture('note_update_failed', {
          note_id: editingNoteId,
          job_id: job.id,
          session_id: draftSessionId,
          ...errorProperties(e),
        });
        Alert.alert('Save failed', formatErrorMessage(e) || 'Could not save note.');
      } finally {
        setNoteSaving(false);
      }
    },
    [closeNoteFlow, draftSessionId, editingNoteId, findNote, formatErrorMessage, job, refetchJob],
  );

  const onDeleteEditingNote = useCallback(async () => {
    if (!editingNoteId) {
      // Add flow — trash simply abandons the draft.
      closeNoteFlow();
      return;
    }
    setNoteSaving(true);
    try {
      await deleteNote(supabase, editingNoteId);
      await refetchJob();
      closeNoteFlow();
      analytics.capture('note_deleted', {
        note_id: editingNoteId,
        source: 'job_detail',
      });
    } catch (e) {
      analytics.capture('note_delete_failed', {
        note_id: editingNoteId,
        source: 'job_detail',
        ...errorProperties(e),
      });
      Alert.alert('Delete failed', formatErrorMessage(e) || 'Could not delete note.');
    } finally {
      setNoteSaving(false);
    }
  }, [closeNoteFlow, editingNoteId, formatErrorMessage, refetchJob]);

  // --- Material add/edit flow ---

  const findMaterial = useCallback(
    (materialId: string): JobDetailMaterialLine | null => {
      if (!job) return null;
      for (const bucket of job.materialBuckets) {
        const hit = bucket.items.find((m) => m.id === materialId);
        if (hit) return hit;
      }
      return null;
    },
    [job],
  );

  const closeMaterialFlow = useCallback(() => {
    setMaterialFlow('closed');
  }, []);

  const openAddMaterial = useCallback(() => {
    if (job) {
      analytics.capture('material_create_opened', {
        source: 'job_detail',
        parent: 'job',
        job_id: job.id,
      });
    }
    setEditingMaterialId(null);
    setMatDraftDescription('');
    setMatDraftUnitCostCents(0);
    setMatDraftQuantity(1);
    setMatDraftUnit('ea');
    setMatDraftSessionId(null);
    setMaterialSheetMounted(true);
    setMaterialFlow('addMaterial');
  }, [job]);

  const openAddMaterialForSession = useCallback((sessionId: string) => {
    if (job) {
      analytics.capture('material_create_opened', {
        source: 'job_detail',
        parent: 'session',
        job_id: job.id,
        session_id: sessionId,
      });
    }
    setEditingMaterialId(null);
    setMatDraftDescription('');
    setMatDraftUnitCostCents(0);
    setMatDraftQuantity(1);
    setMatDraftUnit('ea');
    setMatDraftSessionId(sessionId);
    setMaterialSheetMounted(true);
    setMaterialFlow('addMaterial');
  }, [job]);

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
      setMaterialSheetMounted(true);
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
      if (!job) return;
      setMaterialSaving(true);
      try {
        const materialId = await createMaterial(supabase, {
          jobId: job.id,
          sessionId: matDraftSessionId,
          description: values.description,
          quantity: values.quantity,
          unit: values.unit,
          unitCostCents: values.unitCostCents,
        });
        await refetchJob();
        invalidateJobsList();
        closeMaterialFlow();
        analytics.capture('material_created', {
          source: 'job_detail',
          material_id: materialId,
          parent_type: matDraftSessionId ? 'session' : 'job',
          job_id: job.id,
          session_id: matDraftSessionId,
          unit: values.unit,
          quantity_bucket: quantityBucket(values.quantity),
          cost_bucket: moneyBucket(values.unitCostCents),
          text_length_bucket: textLengthBucket(values.description),
        });
      } catch (e) {
        analytics.capture('material_create_failed', {
          source: 'job_detail',
          parent_type: matDraftSessionId ? 'session' : 'job',
          job_id: job.id,
          session_id: matDraftSessionId,
          ...errorProperties(e),
        });
        Alert.alert(
          'Save failed',
          formatErrorMessage(e) || 'Could not save material.',
        );
      } finally {
        setMaterialSaving(false);
      }
    },
    [closeMaterialFlow, formatErrorMessage, invalidateJobsList, job, matDraftSessionId, refetchJob],
  );

  const onSaveMaterialChanges = useCallback(
    async (values: EditMaterialBottomSheetValues) => {
      if (!editingMaterialId || !job) return;
      setMaterialSaving(true);
      try {
        const previous = findMaterial(editingMaterialId);
        // Pass sessionId unconditionally so the api-client re-parents the row
        // (including `null` → back to unassigned under the current job).
        await updateMaterial(supabase, editingMaterialId, {
          description: values.description,
          quantity: values.quantity,
          unit: values.unit,
          unitCostCents: values.unitCostCents,
          sessionId: matDraftSessionId,
          jobId: matDraftSessionId === null ? job.id : undefined,
        });
        await refetchJob();
        invalidateJobsList();
        closeMaterialFlow();
        analytics.capture('material_updated', {
          material_id: editingMaterialId,
          job_id: job.id,
          session_id: matDraftSessionId,
          changed_fields: changedFields(
            {
              description: previous?.name ?? '',
              quantity: previous?.quantity ?? null,
              unit: previous?.unit ?? '',
              unitCostCents: previous?.unitCostCents ?? null,
              sessionId: previous?.sessionId ?? null,
            },
            {
              description: values.description,
              quantity: values.quantity,
              unit: values.unit,
              unitCostCents: values.unitCostCents,
              sessionId: matDraftSessionId,
            },
          ),
          parent_changed: (previous?.sessionId ?? null) !== matDraftSessionId,
          unit: values.unit,
          quantity_bucket: quantityBucket(values.quantity),
          cost_bucket: moneyBucket(values.unitCostCents),
        });
      } catch (e) {
        analytics.capture('material_update_failed', {
          material_id: editingMaterialId,
          job_id: job.id,
          session_id: matDraftSessionId,
          ...errorProperties(e),
        });
        Alert.alert(
          'Save failed',
          formatErrorMessage(e) || 'Could not save material.',
        );
      } finally {
        setMaterialSaving(false);
      }
    },
    [
      closeMaterialFlow,
      editingMaterialId,
      formatErrorMessage,
      invalidateJobsList,
      job,
      matDraftSessionId,
      refetchJob,
      findMaterial,
    ],
  );

  const onDeleteEditingMaterial = useCallback(async () => {
    if (!editingMaterialId) {
      // Add flow — trash simply abandons the draft.
      closeMaterialFlow();
      return;
    }
    setMaterialSaving(true);
    try {
      await deleteMaterial(supabase, editingMaterialId);
      await refetchJob();
      invalidateJobsList();
      closeMaterialFlow();
      analytics.capture('material_deleted', {
        material_id: editingMaterialId,
        source: 'job_detail',
      });
    } catch (e) {
      analytics.capture('material_delete_failed', {
        material_id: editingMaterialId,
        source: 'job_detail',
        ...errorProperties(e),
      });
      Alert.alert(
        'Delete failed',
        formatErrorMessage(e) || 'Could not delete material.',
      );
    } finally {
      setMaterialSaving(false);
    }
  }, [closeMaterialFlow, editingMaterialId, formatErrorMessage, invalidateJobsList, refetchJob]);

  const onConfirmNoMaterialsUsed = useCallback(async () => {
    if (!job || noMaterialsSaving || !supabaseReady) return;
    setNoMaterialsSaving(true);
    try {
      await updateJobNoMaterialsConfirmed(supabase, job.id, true);
      await refetchJob();
      invalidateJobsList();
      analytics.capture('no_materials_confirmed', {
        job_id: job.id,
        source: 'job_detail',
      });
    } catch (e) {
      analytics.capture('no_materials_confirmation_failed', {
        job_id: job.id,
        action: 'confirm',
        ...errorProperties(e),
      });
      if (isNoMaterialsConfirmedColumnMissingError(e)) {
        Alert.alert(
          'Database update required',
          'Your Supabase project is missing the jobs.no_materials_confirmed column. Apply migrations from the Field Book repo (e.g. 20260429120000_job_no_materials_confirmed.sql), run `supabase db push` against this project, then try again.',
        );
      } else {
        Alert.alert(
          'Update failed',
          formatErrorMessage(e) || 'Could not confirm materials.',
        );
      }
    } finally {
      setNoMaterialsSaving(false);
    }
  }, [
    formatErrorMessage,
    invalidateJobsList,
    job,
    noMaterialsSaving,
    refetchJob,
    supabaseReady,
  ]);

  const onUndoNoMaterialsUsed = useCallback(async () => {
    if (!job || noMaterialsSaving || !supabaseReady) return;
    setNoMaterialsSaving(true);
    try {
      await updateJobNoMaterialsConfirmed(supabase, job.id, false);
      await refetchJob();
      invalidateJobsList();
      analytics.capture('no_materials_confirmation_undone', {
        job_id: job.id,
        source: 'job_detail',
      });
    } catch (e) {
      analytics.capture('no_materials_confirmation_failed', {
        job_id: job.id,
        action: 'undo',
        ...errorProperties(e),
      });
      if (isNoMaterialsConfirmedColumnMissingError(e)) {
        Alert.alert(
          'Database update required',
          'Your Supabase project is missing the jobs.no_materials_confirmed column. Apply migrations from the Field Book repo (e.g. 20260429120000_job_no_materials_confirmed.sql), run `supabase db push` against this project, then try again.',
        );
      } else {
        Alert.alert(
          'Update failed',
          formatErrorMessage(e) || 'Could not undo materials confirmation.',
        );
      }
    } finally {
      setNoMaterialsSaving(false);
    }
  }, [
    formatErrorMessage,
    invalidateJobsList,
    job,
    noMaterialsSaving,
    refetchJob,
    supabaseReady,
  ]);

  /** Sessions visible in current Job Detail UI (completed only). */
  const visibleSessions = useMemo(
    () => job?.displaySessions ?? [],
    [job],
  );

  /**
   * All non-deleted sessions (ended + in progress) for the session picker and
   * draft session labels — matches `job.allSessions`.
   */
  const allSessionsList = useMemo(
    () => job?.allSessions ?? [],
    [job?.allSessions],
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

  /** Hydrated version of `draftSessionId` used by the note sheet subtitle + pill icon. */
  const draftAssignedSession = useMemo(() => {
    if (!draftSessionId) return null;
    const s = allSessionsList.find((x) => x.id === draftSessionId);
    if (!s) return null;
    return { id: s.id, dateLabel: s.dateLabel, timeRangeLabel: s.timeRangeLabel };
  }, [draftSessionId, allSessionsList]);

  /** Hydrated version of `matDraftSessionId` used by the material sheet subtitle + pill. */
  const matDraftAssignedSession = useMemo(() => {
    if (!matDraftSessionId) return null;
    const s = allSessionsList.find((x) => x.id === matDraftSessionId);
    if (!s) return null;
    return { id: s.id, dateLabel: s.dateLabel, timeRangeLabel: s.timeRangeLabel };
  }, [matDraftSessionId, allSessionsList]);

  /** Preset UOM options for the unit-of-measure dropdown (Figma `1882:1781`). */
  const unitOptions = useMemo<DropdownBottomSheetOption[]>(
    () =>
      (['ea', 'ft', 'pcs', 'kit', 'lb', 'gal', 'lot'] as const).map((u) => ({
        id: u,
        label: u,
        value: u,
      })),
    [],
  );

  const onDeleteJobSheet = useCallback(async () => {
    if (!job) return;
    setJobSaving(true);
    try {
      await deleteJobById(supabase, job.id);
      onCloseEditSheet();
      onRequestClose?.();
      analytics.capture('job_deleted', {
        job_id: job.id,
        source: 'job_detail',
      });
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' &&
              e !== null &&
              'message' in e &&
              typeof (e as { message: unknown }).message === 'string'
            ? (e as { message: string }).message
            : String(e);
      analytics.capture('job_delete_failed', {
        job_id: job.id,
        source: 'job_detail',
        ...errorProperties(e),
      });
      Alert.alert('Delete failed', msg || 'Could not delete this job.');
    } finally {
      setJobSaving(false);
    }
  }, [job, onCloseEditSheet, onRequestClose]);

  /** Spinner state: same canvas background as main screen so the transition does not flash a flat color. */
  if (!fontsLoaded || (supabaseReady && jobLoading)) {
    return (
      <View style={styles.loading}>
        <CanvasTiledBackground scrollY={scrollY} />
        <ActivityIndicator
          accessibilityLabel={!fontsLoaded ? 'Loading fonts' : 'Loading job'}
        />
      </View>
    );
  }

  if (supabaseReady && !job) {
    const headerTopPad = Math.max(insets.top - space('Spacing/12'), 0);
    return (
      <View style={styles.root}>
        <CanvasTiledBackground scrollY={scrollY} />
        {onRequestClose ? (
          <View
            style={[
              styles.topHeader,
              { maxWidth: TOP_HEADER_MAX_WIDTH, paddingTop: headerTopPad + space('Spacing/32') },
            ]}
          >
            <View style={styles.topHeaderRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={({ pressed }) => [styles.closeCircle, pressed && styles.pressed]}
              >
                <JobDetailIconTopClose color={fg.primary} />
              </Pressable>
            </View>
          </View>
        ) : null}
        <View style={styles.errorBody}>
          {__DEV__ ? (
            <Text
              style={[
                typography.bodySmall,
                {
                  color: fg.muted,
                  paddingHorizontal: space('Spacing/20'),
                  textAlign: 'center',
                  marginBottom: space('Spacing/12'),
                },
              ]}
            >
              {sessionEmail ?? '(no email)'} · API {supabaseApiHostLabel()}
            </Text>
          ) : null}
          <Text
            style={[
              typography.body,
              { color: fg.primary, paddingHorizontal: space('Spacing/20'), textAlign: 'center' },
            ]}
          >
            {jobLoadError ?? 'Unable to load job.'}
          </Text>
        </View>
      </View>
    );
  }

  if (!job) {
    return null;
  }

  /** Space reserved under the scroll content so the last section clears the fixed bottom tab bar. */
  const bottomNavReservedHeight = shellBottomNavOuterHeight(insets.bottom);

  return (
    <View style={styles.root}>
      {/* Lined canvas + cream fill — behind all scroll content. Sized to
          the scrollable content height so the ruled texture doesn't cut
          off on long screens. */}
      <CanvasTiledBackground
        scrollY={scrollY}
        contentHeight={scrollContentHeight}
      />
      <Animated.ScrollView
        style={[styles.scroll, styles.scrollTransparent]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        onContentSizeChange={(_w, h) => setScrollContentHeight(h)}
        scrollEventThrottle={16}
        contentContainerStyle={{
          width: '100%',
          paddingTop: Math.max(
            0,
            insets.top - space('Spacing/6') - space('Spacing/12'),
          ),
          paddingBottom: space('Spacing/20') + bottomNavReservedHeight,
          alignItems: 'center',
        }}
        keyboardShouldPersistTaps="handled"
      >
        {__DEV__ && supabaseReady ? (
          <Text
            style={[
              typography.bodySmall,
              {
                color: fg.muted,
                alignSelf: 'center',
                marginBottom: space('Spacing/8'),
                paddingHorizontal: space('Spacing/20'),
                textAlign: 'center',
              },
            ]}
          >
            {sessionEmail ?? '(no email)'} · {supabaseApiHostLabel()} · job {job.id}
          </Text>
        ) : null}
        {/* `TopHeader` variant `X (Close &Edit)` (`231:858`) */}
        <View style={[styles.topHeader, { maxWidth: TOP_HEADER_MAX_WIDTH }]}>
          <View style={styles.topHeaderRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={({ pressed }) => [styles.closeCircle, pressed && styles.pressed]}
            >
              <JobDetailIconTopClose color={fg.primary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit job"
              onPress={onEdit}
              style={({ pressed }) => [styles.editPill, pressed && styles.pressed]}
            >
              <JobDetailIconTopEdit color={color('Semantic/Action/Primary')} />
              <Text style={[typography.pillCompact, { color: color('Semantic/Status/Error/Text') }]}>
                EDIT
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Main column: horizontal padding + vertical gap; width caps at DS max (see `styles.slot`). */}
        <View style={styles.slot}>
          <JobDetailJobHeader
            title={job.shortDescription}
            customerName={job.customerName}
            serviceAddress={job.serviceAddress}
            lastWorkedLabel={job.lastWorkedLabel}
            workStatus={job.workStatus}
            typography={typography}
          />
          <JobDetailSummaryCard earnings={job.earnings} typography={typography} />
          <JobDetailCtaRow
            workStatus={job.workStatus}
            typography={typography}
            onPrimaryPress={() => {
              void onPrimaryStatusCta();
            }}
            onMorePress={openStatusSheet}
            MoreIcon={<JobDetailIconCtaMore color={fg.primary} />}
            primaryDisabled={statusActionPending}
            moreDisabled={statusActionPending}
          />
          <JobDetailMetricTertiary metrics={job.metrics} typography={typography} />
        </View>

        {/* Section headers are full-bleed within max width; ADD uses error-tint pill like Figma. */}
        <SectionHeaderFigma
          title="SESSIONS"
          icon={<JobDetailIconSectionSessions color={color('Brand/Accent')} />}
          typography={typography}
          showAdd
          onAddPress={openSessionChooser}
        />
        <View style={[styles.sessionList, { maxWidth: CONTENT_MAX_WIDTH }]}>
          {visibleSessions.length === 0 ? (
            <SectionEmptyStateCard message="No sessions recorded." typography={typography} />
          ) : (
            visibleSessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                typography={typography}
                expanded={expandedSessionId === s.id}
                onToggle={() =>
                  setExpandedSessionId((prev) => (prev === s.id ? null : s.id))
                }
                onEditPress={() => openEditSession(s.id)}
                onAddNote={() => openAddNoteForSession(s.id)}
                onAddMaterial={() => openAddMaterialForSession(s.id)}
                onPressAttachment={({ kind, id }) => {
                  if (kind === 'note') {
                    openEditNote(id);
                  } else {
                    openEditMaterial(id);
                  }
                }}
              />
            ))
          )}
        </View>

        <SectionHeaderFigma
          title="MATERIALS"
          icon={<JobDetailIconSectionMaterials color={color('Brand/Accent')} />}
          typography={typography}
          showAdd
          onAddPress={openAddMaterial}
        />
        {job.materialBuckets.length === 0 ? (
          job.noMaterialsConfirmed ? (
            <MaterialsConfirmedNoUseCard
              typography={typography}
              onUndo={onUndoNoMaterialsUsed}
              undoDisabled={noMaterialsSaving}
            />
          ) : (
            <MaterialsEmptyStateCard
              typography={typography}
              onConfirmNoMaterials={onConfirmNoMaterialsUsed}
              confirmDisabled={noMaterialsSaving}
            />
          )
        ) : (
          <ViewMaterialsBuckets
            buckets={job.materialBuckets}
            typography={typography}
            onMaterialPress={openEditMaterial}
          />
        )}

        <SectionHeaderFigma
          title="NOTES"
          icon={<JobDetailIconSectionNotes color={color('Brand/Accent')} />}
          typography={typography}
          showAdd
          onAddPress={openAddNote}
        />
        {job.noteBuckets.length === 0 ? (
          <SectionEmptyStateCard message="No notes recorded." typography={typography} />
        ) : (
          <ViewNotesBuckets
            buckets={job.noteBuckets}
            typography={typography}
            onNotePress={openEditNote}
          />
        )}
      </Animated.ScrollView>

      {/* Shared bottom nav — JOBS is the active tab here. Tapping HOME /
          JOBS / EARNINGS bubbles up to the parent which closes Job Detail
          and switches the shell tab in one update (see App.tsx). */}
      <ShellBottomNav
        selected="jobs"
        onSelect={(tab) => {
          onSelectShellTab?.(tab);
        }}
      />
      {editSheetMounted ? (
        <EditJobBottomSheet
          typography={typography}
          values={job ? toEditValues(job) : undefined}
          visible={editSheetVisible}
          onClose={onCloseEditSheet}
          onClosed={() => setEditSheetMounted(false)}
          onSavePress={onSaveJobSheet}
          onDeletePress={() => {
            void onDeleteJobSheet();
          }}
        />
      ) : null}
      {statusSheetMounted ? (
        <DropdownBottomSheet
          typography={typography}
          visible={statusSheetVisible}
          options={jobStatusSheetOptions}
          currentValue={job?.workStatus ?? null}
          allowCustom={false}
          onClose={closeStatusSheet}
          onClosed={() => {
            setStatusSheetMounted(false);
          }}
          onSelect={(value) => {
            void onSelectJobStatusFromSheet(value);
          }}
        />
      ) : null}
      {noteSheetMounted ? (
        <>
          <EditNoteBottomSheet
            typography={typography}
            visible={noteFlow === 'addNote' || noteFlow === 'editNote'}
            // Derive stable title/primaryLabel from editingNoteId (not noteFlow)
            // so they do not flicker during the slide-down close animation.
            title={editingNoteId ? 'Edit Note' : 'Add Note'}
            primaryLabel={editingNoteId ? 'SAVE CHANGES' : 'SAVE NEW NOTE'}
            values={{ body: draftBody }}
            assignedSession={draftAssignedSession}
            canAttachSession={chooserSessions.length > 0}
            onClose={closeNoteFlow}
            onClosed={() => {
              if (noteFlow === 'closed') setNoteSheetMounted(false);
            }}
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
              // Lift the typed body into parent draft state before swapping
              // to the session picker — the note sheet is hidden (and its
              // local state reseeded from `values.body`) on return, so
              // without this cache the typed body would reset.
              setDraftBody(values.body);
              openSessionPickerFromNoteSheet();
            }}
          />
          <ChooseSessionBottomSheet
            typography={typography}
            visible={noteFlow === 'attachSession' || noteFlow === 'editSession'}
            mode={noteFlow === 'editSession' ? 'edit' : 'attach'}
            sessions={chooserSessions}
            currentSessionId={draftSessionId}
            onClose={closeNoteFlow}
            onClosed={() => {
              if (noteFlow === 'closed') setNoteSheetMounted(false);
            }}
            onBack={returnToNoteSheet}
            onSelect={onSelectDraftSession}
            onRemove={onRemoveDraftSession}
          />
        </>
      ) : null}
      {materialSheetMounted ? (
        <>
          <EditMaterialBottomSheet
            typography={typography}
            visible={materialFlow === 'addMaterial' || materialFlow === 'editMaterial'}
            // Derive stable title/primaryLabel from editingMaterialId (not
            // materialFlow) so they do not flicker during the slide-down.
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
            onClose={closeMaterialFlow}
            onClosed={() => {
              if (materialFlow === 'closed') setMaterialSheetMounted(false);
            }}
            onBack={closeMaterialFlow}
            onSavePress={(values) => {
              if (materialSaving) return;
              // Capture the latest draft values so a subsequent open of the
              // same sheet (e.g. after re-picking session) shows them.
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
              // Lift the in-sheet text edits into parent draft state before
              // swapping to the session picker — the material sheet is
              // hidden (and its local state reseeded from `values`) on
              // return, so without this cache the inputs would reset.
              setMatDraftDescription(values.description);
              setMatDraftUnitCostCents(values.unitCostCents);
              setMatDraftQuantity(values.quantity);
              setMatDraftUnit(values.unit);
              openSessionPickerFromMaterialSheet();
            }}
            onUnitPress={(values) => {
              // Same lift pattern as the session pill — without this the
              // description / price / qty reset when returning from the
              // unit picker.
              setMatDraftDescription(values.description);
              setMatDraftUnitCostCents(values.unitCostCents);
              setMatDraftQuantity(values.quantity);
              setMatDraftUnit(values.unit);
              openUnitPickerFromMaterialSheet();
            }}
          />
          <ChooseSessionBottomSheet
            typography={typography}
            visible={
              materialFlow === 'attachSession' || materialFlow === 'editSession'
            }
            mode={materialFlow === 'editSession' ? 'edit' : 'attach'}
            sessions={chooserSessions}
            currentSessionId={matDraftSessionId}
            onClose={closeMaterialFlow}
            onClosed={() => {
              if (materialFlow === 'closed') setMaterialSheetMounted(false);
            }}
            onBack={returnToMaterialSheet}
            onSelect={onSelectMaterialSession}
            onRemove={onRemoveMaterialSession}
          />
          <DropdownBottomSheet
            typography={typography}
            visible={materialFlow === 'chooseUnit'}
            options={unitOptions}
            currentValue={matDraftUnit}
            allowCustom
            customPlaceholder="Custom"
            onClose={closeMaterialFlow}
            onClosed={() => {
              if (materialFlow === 'closed') setMaterialSheetMounted(false);
            }}
            onBack={returnToMaterialSheet}
            onSelect={onSelectMaterialUnit}
          />
        </>
      ) : null}
      {sessionSheetMounted ? (
        <>
          <NewSessionBottomSheet
            typography={typography}
            visible={sessionFlow === 'chooser'}
            onClose={closeSessionFlow}
            onClosed={() => {
              if (sessionFlow === 'closed') setSessionSheetMounted(false);
            }}
            onLiveSessionPress={() => void onStartLiveSession()}
            onLogPastPress={openAddSession}
          />
          <EditSessionBottomSheet
            typography={typography}
            visible={sessionFlow === 'addForm' || sessionFlow === 'editForm'}
            // Derive mode from editingSessionId (not sessionFlow) so the title /
            // primary label stay stable during the slide-down close animation,
            // where sessionFlow has already flipped to 'closed'.
            title={editingSessionId ? 'Edit Session' : 'Add Session'}
            primaryLabel={editingSessionId ? 'SAVE CHANGES' : 'SAVE NEW SESSION'}
            values={
              editingSessionId && editingSession
                ? {
                    startedAt: editingSession.startedAt,
                    endedAt:
                      editingSession.endedAt ?? editingSession.startedAt,
                  }
                : undefined
            }
            onClose={closeSessionFlow}
            onClosed={() => {
              if (sessionFlow === 'closed') setSessionSheetMounted(false);
            }}
            onBack={() => {
              if (sessionFlow === 'addForm') {
                setSessionFlow('chooser');
              } else {
                closeSessionFlow();
              }
            }}
            onSavePress={(values) => {
              if (sessionSaving) return;
              if (sessionFlow === 'editForm') {
                void onSaveSessionChanges(values);
              } else {
                void onSaveNewSession(values);
              }
            }}
            onDeletePress={() => {
              if (sessionSaving) return;
              if (sessionFlow === 'editForm') {
                void onDeleteEditingSession();
              } else {
                closeSessionFlow();
              }
            }}
          />
        </>
      ) : null}
    </View>
  );
}

// --- Section empty states (Figma `787:73`, `787:97`) ---

function SectionEmptyStateCard({
  message,
  typography,
}: {
  message: string;
  typography: TextStyles;
}) {
  return (
    <View style={[styles.viewCardOuter, { maxWidth: CONTENT_MAX_WIDTH }]}>
      <View style={[styles.viewCardBorder, cardShadowRn, styles.sectionEmptyCardPad]}>
        <Text style={[typography.body, { color: fg.secondary, textAlign: 'center' }]}>{message}</Text>
      </View>
    </View>
  );
}

function MaterialsEmptyStateCard({
  typography,
  onConfirmNoMaterials,
  confirmDisabled,
}: {
  typography: TextStyles;
  onConfirmNoMaterials: () => void;
  confirmDisabled?: boolean;
}) {
  const ctaColor = color('Semantic/Status/Success/Text');
  return (
    <View style={[styles.viewCardOuter, { maxWidth: CONTENT_MAX_WIDTH }]}>
      <View style={[styles.viewCardBorder, cardShadowRn, styles.materialsEmptyCardPad]}>
        <Text style={[typography.body, { color: fg.secondary, textAlign: 'center' }]}>
          No materials recorded.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Confirm no materials used"
          onPress={onConfirmNoMaterials}
          disabled={confirmDisabled}
          style={({ pressed }) => [
            styles.materialsConfirmCta,
            pressed && !confirmDisabled && styles.pressed,
            confirmDisabled ? { opacity: 0.5 } : null,
          ]}
        >
          <Text style={[typography.labelCaps, { color: ctaColor, textAlign: 'center' }]}>
            CONFIRM NO MATERIALS USED
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function MaterialsConfirmedNoUseCard({
  typography,
  onUndo,
  undoDisabled,
}: {
  typography: TextStyles;
  onUndo: () => void;
  undoDisabled?: boolean;
}) {
  const ok = color('Semantic/Status/Success/Text');
  return (
    <View style={[styles.viewCardOuter, { maxWidth: CONTENT_MAX_WIDTH }]}>
      <View style={[styles.viewCardBorder, cardShadowRn, styles.materialsEmptyCardPad]}>
        <Text style={[typography.bodyBold, { color: ok, textAlign: 'center' }]}>
          ✓ No materials used
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Undo no materials confirmation"
          onPress={onUndo}
          disabled={undoDisabled}
          style={({ pressed }) => [pressed && !undoDisabled && styles.pressed, undoDisabled ? { opacity: 0.5 } : null]}
        >
          <Text
            style={[
              typography.bodySmall,
              {
                color: fg.secondary,
                textDecorationLine: 'underline',
                textAlign: 'center',
                marginTop: space('Spacing/12'),
              },
            ]}
          >
            Undo
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// --- Section header (Figma `371:2179` Row) ---

/** Leading icon + Metric-S title; optional trailing ADD pill when `showAdd` is true. */
function SectionHeaderFigma({
  title,
  icon,
  typography,
  showAdd,
  onAddPress,
}: {
  title: string;
  icon: ReactNode;
  typography: TextStyles;
  showAdd: boolean;
  onAddPress?: () => void;
}) {
  return (
    <View style={[styles.sectionHeader, { maxWidth: TOP_HEADER_MAX_WIDTH }]}>
      <View style={styles.sectionHeaderLead}>
        {icon}
        <View style={styles.sectionHeaderTitleWrap}>
          <Text style={typography.metricS} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>
      {showAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${title}`}
          onPress={onAddPress}
          disabled={!onAddPress}
          style={({ pressed }) => [styles.addPill, pressed && styles.pressed]}
        >
          <JobDetailIconSectionAdd color={color('Semantic/Status/Error/Text')} />
          <Text style={[typography.pillCompact, { color: color('Semantic/Status/Error/Text') }]}>
            ADD
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// `ViewMaterialsBuckets` / `ViewNotesBuckets` and the `bucketSessionHeaderTitle`
// helper now live in `components/ds/ViewActivityBuckets` so the Inbox can reuse
// the same UNASSIGNED card + rows.

// Bottom nav (Figma `225:12089`) is rendered via the shared
// `ShellBottomNav` component (see imports above). The local
// `BottomNavTabCell` / `BottomNavJobs` placeholders that used to live here
// were removed when the tabs were wired for cross-screen navigation.

// -----------------------------------------------------------------------------
// Styles — grouped roughly top-to-bottom to match the component tree
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  /**
   * Screen root: one column. The ruled-line texture is painted by
   * `CanvasTiledBackground` layered above this root, but we also set
   * the cream fill here as a safety net — if the tiled layer ever lags
   * behind a layout change (e.g. content grew but `onContentSizeChange`
   * hasn't fired yet), users see the same cream colour instead of iOS's
   * default system background bleeding through.
   */
  root: { flex: 1, backgroundColor: bg.canvasWarm },
  /** Centered spinner over the same lined background as the loaded screen. */
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space('Spacing/20'),
  },
  /** Scroll fills root; flex lets the fixed bottom nav sit in the same column without overlapping scroll height math incorrectly. */
  scroll: { flex: 1, zIndex: 1 },
  /** Default scroll content background can read as white on iOS; keep lines visible. */
  scrollTransparent: { backgroundColor: 'transparent' },
  /** Shared pressed state for `Pressable` opacity feedback. */
  pressed: { opacity: 0.75 },

  /**
   * Toolbar chrome only — no fill so `CanvasTiledBackground` (sibling under `ScrollView`) shows the same
   * cream + ruled lines here as in the body. Shadow still separates the header band from content below.
   */
  topHeader: {
    width: '100%',
    alignSelf: 'center',
    backgroundColor: 'transparent',
    paddingTop: space('Spacing/32'),
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space('Spacing/20'),
    paddingBottom: space('Spacing/12'),
  },
  closeCircle: {
    width: space('Spacing/32'),
    height: space('Spacing/32'),
    borderRadius: radius('Radius/16'),
    backgroundColor: bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/8'),
    height: space('Spacing/24'),
    paddingHorizontal: space('Spacing/12'),
    paddingVertical: space('Spacing/4'),
    borderRadius: radius('Radius/Full'),
    backgroundColor: color('Semantic/Status/Error/BG'),
  },

  /** Padded column for the “hero” block: job header, summary, CTAs, metric card — width responsive, max DS width. */
  slot: {
    width: '100%',
    maxWidth: TOP_HEADER_MAX_WIDTH,
    paddingHorizontal: space('Spacing/20'),
    gap: SLOT_GAP,
    alignItems: 'center',
  },

  /** Full-bleed section title + optional ADD — slightly tighter vertical rhythm. */
  sectionHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space('Spacing/24'),
    paddingBottom: space('Spacing/12'),
    paddingHorizontal: space('Spacing/20'),
  },
  sectionHeaderLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/8'),
    flex: 1,
    minWidth: 0,
  },
  sectionHeaderTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color('Semantic/Status/Error/BG'),
    borderRadius: radius('Radius/Full'),
    height: space('Spacing/24'),
    paddingHorizontal: space('Spacing/12'),
    gap: space('Spacing/8'),
  },

  /** Column wrapper for the Sessions list — caps to DS content width. */
  sessionList: {
    width: '100%',
  },

  sectionEmptyCardPad: {
    paddingVertical: space('Spacing/20'),
    paddingHorizontal: space('Spacing/16'),
    alignItems: 'center',
  },
  materialsEmptyCardPad: {
    paddingVertical: space('Spacing/20'),
    paddingHorizontal: space('Spacing/16'),
    alignItems: 'center',
    gap: space('Spacing/16'),
  },
  materialsConfirmCta: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space('Spacing/12'),
    paddingHorizontal: space('Spacing/16'),
    borderRadius: radius('Radius/Full'),
    backgroundColor: color('Semantic/Status/Success/BG'),
  },

  /** Vertical breathing room around materials/notes cards (Figma `py-[9px]`). */
  viewCardOuter: {
    width: '100%',
    paddingVertical: space('Spacing/8'),
  },
  /** Single surface: rounded rect, clip children so bucket headers respect corner radius. */
  viewCardBorder: {
    borderRadius: radius('Radius/16'),
    borderWidth: 1,
    borderColor: border.subtle,
    backgroundColor: bg.surfaceWhite,
    overflow: 'hidden',
  },
});
