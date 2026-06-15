import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { color, radius, space } from '@fieldsolo/design-system/lib/tokens';

import {
  SessionChooserRowPlayIcon,
  SessionSheetBackIcon,
} from '../figma-icons/JobDetailScreenIcons';
import {
  QuickCaptureNewMaterialIcon,
  QuickCaptureNewNoteIcon,
  QuickCaptureStartSessionIcon,
} from '../figma-icons/QuickActionsSheetIcons';
import { bg, border, fg } from '../../theme/nativeTokens';
import type { TextStyles } from '../../theme/nativeTokens';
import { BottomSheetShell } from './BottomSheetShell';

export type QuickActionsRecentJob = {
  id: string;
  shortDescription: string;
  customerName: string | null;
};

/** Which sub-action the chooser step is attaching to. */
export type QuickCaptureKind = 'note' | 'material';

export type QuickActionsStep =
  | 'quickCapture'
  | 'chooseJob'
  | 'noteCapture'
  | 'materialCapture';

type QuickActionsBottomSheetProps = {
  typography: TextStyles;
  visible: boolean;
  /** Controlled step — owned by the parent so it can return here after a sub-sheet's Back. */
  step: QuickActionsStep;
  onStepChange: (step: QuickActionsStep) => void;
  recentJobs: QuickActionsRecentJob[];
  recentJobsLoading: boolean;
  recentJobsError: string | null;
  /** Mutation error (e.g. session start failed). Only shown on the Start Session step. */
  actionError: string | null;
  /** Disabled while a startLiveSession call is in flight. */
  starting: boolean;
  onClose: () => void;
  onClosed?: () => void;
  /** Start Session step: attach a live session to an existing job. */
  onSelectExistingJob: (job: QuickActionsRecentJob) => void;
  onStartNewSession: () => void;
  /** Note / Material steps: attach the capture to an existing job. */
  onSelectJobForCapture: (job: QuickActionsRecentJob, kind: QuickCaptureKind) => void;
  /** Note / Material steps: save the capture to the Inbox (no job). */
  onCreateQuickCapture: (kind: QuickCaptureKind) => void;
};

/**
 * Home Quick Capture flow: action tiles, then a per-action chooser (Start
 * Session / New Note / New Material). Single BottomSheetShell; steps swap so
 * height follows the active step. The step is controlled by the parent so the
 * capture sub-sheets (Edit Note / Material) can return to the matching chooser.
 */
export function QuickActionsBottomSheet({
  typography,
  visible,
  step,
  onStepChange,
  recentJobs,
  recentJobsLoading,
  recentJobsError,
  actionError,
  starting,
  onClose,
  onClosed,
  onSelectExistingJob,
  onStartNewSession,
  onSelectJobForCapture,
  onCreateQuickCapture,
}: QuickActionsBottomSheetProps) {
  return (
    <BottomSheetShell visible={visible} onClose={onClose} onClosed={onClosed}>
      <View style={styles.stack}>
        {step === 'quickCapture' ? (
          <QuickCaptureStepContent
            typography={typography}
            onStartSessionPress={() => onStepChange('chooseJob')}
            onNewNotePress={() => onStepChange('noteCapture')}
            onNewMaterialPress={() => onStepChange('materialCapture')}
          />
        ) : (
          <AttachChooserStepContent
            variant={step}
            typography={typography}
            recentJobs={recentJobs}
            recentJobsLoading={recentJobsLoading}
            recentJobsError={recentJobsError}
            actionError={actionError}
            starting={starting}
            onBack={() => onStepChange('quickCapture')}
            onSelectExistingJob={onSelectExistingJob}
            onStartNewSession={onStartNewSession}
            onSelectJobForCapture={onSelectJobForCapture}
            onCreateQuickCapture={onCreateQuickCapture}
          />
        )}
      </View>
    </BottomSheetShell>
  );
}

function QuickCaptureStepContent({
  typography,
  onStartSessionPress,
  onNewNotePress,
  onNewMaterialPress,
}: {
  typography: TextStyles;
  onStartSessionPress: () => void;
  onNewNotePress: () => void;
  onNewMaterialPress: () => void;
}) {
  return (
    <View style={styles.quickBody}>
      <Text style={[typography.titleH3, styles.quickTitle, { color: fg.primary }]}>
        Quick Capture
      </Text>
      <View style={styles.tileRow}>
        <QuickCaptureTile
          typography={typography}
          iconCircleColor={color('Semantic/Status/Error/Text')}
          icon={<QuickCaptureStartSessionIcon color={bg.surfaceWhite} size={20} />}
          line1="START"
          line2="SESSION"
          onPress={onStartSessionPress}
        />
        <QuickCaptureTile
          typography={typography}
          iconCircleColor={color('Semantic/Activity/Note')}
          icon={<QuickCaptureNewNoteIcon color={bg.surfaceWhite} size={20} />}
          line1="NEW"
          line2="NOTE"
          onPress={onNewNotePress}
        />
        <QuickCaptureTile
          typography={typography}
          iconCircleColor={color('Semantic/Activity/Material')}
          icon={<QuickCaptureNewMaterialIcon color={bg.surfaceWhite} size={20} />}
          line1="NEW"
          line2="MATERIAL"
          onPress={onNewMaterialPress}
        />
      </View>
    </View>
  );
}

function QuickCaptureTile({
  typography,
  iconCircleColor,
  icon,
  line1,
  line2,
  onPress,
  disabled,
}: {
  typography: TextStyles;
  iconCircleColor: string;
  icon: ReactNode;
  line1: string;
  line2: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const inactive = Boolean(disabled);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.tile,
        {
          borderColor: border.default,
        },
        pressed && !inactive ? styles.pressed : null,
      ]}
    >
      <View style={[styles.tileIconCircle, { backgroundColor: iconCircleColor }]}>{icon}</View>
      <View style={styles.tileLabelCol}>
        <Text
          style={[typography.bodySmall, styles.tileLabelLine, { color: fg.primary }]}
          numberOfLines={1}
        >
          {line1}
        </Text>
        <Text
          style={[typography.bodySmall, styles.tileLabelLine, { color: fg.primary }]}
          numberOfLines={1}
        >
          {line2}
        </Text>
      </View>
    </Pressable>
  );
}

type ChooserVariant = Exclude<QuickActionsStep, 'quickCapture'>;

type ChooserConfig = {
  title: string;
  primaryLabel: string;
  primarySubtitle: string;
  primaryColor: string;
  icon: ReactNode;
};

function chooserConfig(variant: ChooserVariant): ChooserConfig {
  switch (variant) {
    case 'noteCapture':
      return {
        title: 'New Note',
        primaryLabel: 'Create Quick Note',
        primarySubtitle: 'Save to Inbox — assign to a job later',
        primaryColor: color('Semantic/Activity/Note'),
        icon: <QuickCaptureNewNoteIcon color={fg.muted} size={20} />,
      };
    case 'materialCapture':
      return {
        title: 'New Material',
        primaryLabel: 'Add Quick Material',
        primarySubtitle: 'Save to Inbox — assign to a job later',
        primaryColor: color('Semantic/Activity/Material'),
        icon: <QuickCaptureNewMaterialIcon color={fg.muted} size={20} />,
      };
    case 'chooseJob':
    default:
      return {
        title: 'Start Session',
        primaryLabel: 'Start New Session',
        primarySubtitle: 'Begin tracking now — add job details later',
        primaryColor: color('Brand/Primary'),
        icon: <SessionChooserRowPlayIcon color={fg.muted} />,
      };
  }
}

function AttachChooserStepContent({
  variant,
  typography,
  recentJobs,
  recentJobsLoading,
  recentJobsError,
  actionError,
  starting,
  onBack,
  onSelectExistingJob,
  onStartNewSession,
  onSelectJobForCapture,
  onCreateQuickCapture,
}: {
  variant: ChooserVariant;
  typography: TextStyles;
  recentJobs: QuickActionsRecentJob[];
  recentJobsLoading: boolean;
  recentJobsError: string | null;
  actionError: string | null;
  starting: boolean;
  onBack: () => void;
  onSelectExistingJob: (job: QuickActionsRecentJob) => void;
  onStartNewSession: () => void;
  onSelectJobForCapture: (job: QuickActionsRecentJob, kind: QuickCaptureKind) => void;
  onCreateQuickCapture: (kind: QuickCaptureKind) => void;
}) {
  const cfg = chooserConfig(variant);
  const isSession = variant === 'chooseJob';
  const kind: QuickCaptureKind = variant === 'materialCapture' ? 'material' : 'note';
  // Only the Start Session path runs an inline mutation we must guard against.
  const busy = isSession && starting;

  const onPrimary = () => {
    if (isSession) {
      onStartNewSession();
    } else {
      onCreateQuickCapture(kind);
    }
  };
  const onSelectJob = (job: QuickActionsRecentJob) => {
    if (isSession) {
      onSelectExistingJob(job);
    } else {
      onSelectJobForCapture(job, kind);
    }
  };

  const showFetchError = recentJobsError != null && recentJobsError.length > 0;
  const showActionError = isSession && actionError != null && actionError.length > 0;

  return (
    <View style={styles.chooseBody}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <SessionSheetBackIcon color={fg.secondary} />
        <Text style={[typography.bodyBold, { color: fg.secondary }]}>Back</Text>
      </Pressable>

      <Text style={[typography.titleH3, styles.chooseTitle, { color: fg.primary }]}>
        {cfg.title}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cfg.primaryLabel}
        disabled={busy}
        onPress={onPrimary}
        style={({ pressed }) => [
          styles.primaryRow,
          {
            backgroundColor: cfg.primaryColor,
            borderColor: border.subtle,
          },
          pressed && !busy ? styles.pressed : null,
          busy ? { opacity: 0.85 } : null,
        ]}
      >
        <View style={styles.primaryRowLeading}>{cfg.icon}</View>
        <View style={styles.primaryRowTextStack}>
          <Text style={[typography.bodyBold, { color: fg.muted }]} numberOfLines={1}>
            {cfg.primaryLabel}
          </Text>
          <Text style={[typography.bodySmall, { color: fg.muted }]} numberOfLines={2}>
            {cfg.primarySubtitle}
          </Text>
        </View>
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={[typography.statusPillLabel, styles.dividerLabel, { color: fg.secondary }]}>
          OR ATTACH TO EXISTING JOB
        </Text>
        <View style={styles.dividerLine} />
      </View>

      {showFetchError ? (
        <Text
          style={[typography.bodySmall, styles.inlineError, { color: color('Semantic/Status/Error/Text') }]}
        >
          {recentJobsError}
        </Text>
      ) : null}
      {showActionError ? (
        <Text
          style={[typography.bodySmall, styles.inlineError, { color: color('Semantic/Status/Error/Text') }]}
        >
          {actionError}
        </Text>
      ) : null}

      {recentJobsLoading ? (
        <View style={styles.placeholderList}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.placeholderRow}>
              {i === 0 ? <ActivityIndicator color={fg.secondary} /> : null}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.jobList}>
          {recentJobs.map((job) => (
            <Pressable
              key={job.id}
              accessibilityRole="button"
              accessibilityLabel={`Attach to job ${job.shortDescription}`}
              disabled={busy}
              onPress={() => onSelectJob(job)}
              style={({ pressed }) => [
                styles.jobRow,
                {
                  borderColor: border.subtle,
                  backgroundColor: bg.surfaceWhite,
                },
                pressed && !busy ? styles.pressed : null,
              ]}
            >
              <View style={styles.jobRowTextStack}>
                <Text style={[typography.bodyBold, { color: fg.primary }]} numberOfLines={1}>
                  {job.shortDescription}
                </Text>
                <Text style={[typography.bodySmall, { color: fg.secondary }]} numberOfLines={1}>
                  {(job.customerName ?? '').trim() || 'No customer'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: '100%',
  },
  quickBody: {
    width: '100%',
    gap: space('Spacing/16'),
    paddingTop: 0,
  },
  quickTitle: {
    textAlign: 'center',
  },
  tileRow: {
    flexDirection: 'row',
    gap: space('Spacing/12'),
    width: '100%',
  },
  tile: {
    flex: 1,
    minWidth: 0,
    height: 112,
    borderRadius: radius('Radius/16'),
    borderWidth: 1,
    backgroundColor: bg.surfaceWhite,
    alignItems: 'center',
    paddingTop: space('Spacing/16'),
    paddingHorizontal: space('Spacing/4'),
    shadowColor: color('Foundation/Text/Primary'),
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tileIconCircle: {
    width: space('Spacing/40'),
    height: space('Spacing/40'),
    borderRadius: radius('Radius/Full'),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space('Spacing/8'),
  },
  tileLabelCol: {
    alignItems: 'center',
    gap: 3,
    maxWidth: '100%',
  },
  tileLabelLine: {
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  chooseBody: {
    width: '100%',
    gap: space('Spacing/12'),
    paddingTop: 0,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/4'),
    alignSelf: 'flex-start',
  },
  chooseTitle: {
    textAlign: 'center',
    marginTop: space('Spacing/8'),
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/12'),
    minHeight: space('Spacing/80') + space('Spacing/4'),
    paddingHorizontal: space('Spacing/20'),
    paddingVertical: space('Spacing/16'),
    borderRadius: radius('Radius/16'),
    borderWidth: 1,
    shadowColor: color('Foundation/Text/Primary'),
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginTop: space('Spacing/8'),
  },
  primaryRowLeading: {
    width: space('Spacing/40'),
    height: space('Spacing/40'),
    borderRadius: radius('Radius/Full'),
    backgroundColor: 'rgba(250,246,240,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryRowTextStack: {
    flex: 1,
    minWidth: 0,
    gap: space('Spacing/4'),
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/12'),
    marginTop: space('Spacing/8'),
    paddingVertical: space('Spacing/8'),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: border.subtle,
  },
  dividerLabel: {
    flexShrink: 1,
    textAlign: 'center',
  },
  inlineError: {
    textAlign: 'center',
  },
  placeholderList: {
    gap: space('Spacing/12'),
  },
  placeholderRow: {
    minHeight: 74,
    borderRadius: radius('Radius/16'),
    backgroundColor: bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobList: {
    gap: space('Spacing/12'),
    width: '100%',
  },
  jobRow: {
    minHeight: 74,
    borderRadius: radius('Radius/16'),
    borderWidth: 1,
    paddingHorizontal: space('Spacing/20'),
    paddingVertical: space('Spacing/16'),
    shadowColor: color('Foundation/Text/Primary'),
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  jobRowTextStack: {
    gap: space('Spacing/4'),
    flex: 1,
    minWidth: 0,
  },
  pressed: { opacity: 0.8 },
});
