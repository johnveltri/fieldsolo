import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { color, radius, space } from '@fieldbook/design-system/lib/tokens';

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

type QuickActionsBottomSheetProps = {
  typography: TextStyles;
  visible: boolean;
  recentJobs: QuickActionsRecentJob[];
  recentJobsLoading: boolean;
  recentJobsError: string | null;
  /** Mutation error (e.g. session start failed). */
  actionError: string | null;
  /** Disabled while a startLiveSession call is in flight. */
  starting: boolean;
  onClose: () => void;
  onClosed?: () => void;
  onSelectExistingJob: (job: QuickActionsRecentJob) => void;
  onStartNewSession: () => void;
};

type Step = 'quickCapture' | 'chooseJob';

/**
 * Home Quick Capture flow: action tiles, then Start Session job chooser.
 * Single BottomSheetShell; steps swap so height follows the active step (no fixed min-height).
 */
export function QuickActionsBottomSheet({
  typography,
  visible,
  recentJobs,
  recentJobsLoading,
  recentJobsError,
  actionError,
  starting,
  onClose,
  onClosed,
  onSelectExistingJob,
  onStartNewSession,
}: QuickActionsBottomSheetProps) {
  const [step, setStep] = useState<Step>('quickCapture');
  const prevVisible = useRef(false);

  useEffect(() => {
    const opening = visible && !prevVisible.current;
    prevVisible.current = visible;
    if (opening) {
      setStep('quickCapture');
    }
  }, [visible]);

  return (
    <BottomSheetShell visible={visible} onClose={onClose} onClosed={onClosed}>
      <View style={styles.stack}>
        {step === 'quickCapture' ? (
          <QuickCaptureStepContent
            typography={typography}
            onStartSessionPress={() => setStep('chooseJob')}
          />
        ) : (
          <ChooseJobStepContent
            typography={typography}
            recentJobs={recentJobs}
            recentJobsLoading={recentJobsLoading}
            recentJobsError={recentJobsError}
            actionError={actionError}
            starting={starting}
            onBack={() => setStep('quickCapture')}
            onSelectExistingJob={onSelectExistingJob}
            onStartNewSession={onStartNewSession}
          />
        )}
      </View>
    </BottomSheetShell>
  );
}

function QuickCaptureStepContent({
  typography,
  onStartSessionPress,
}: {
  typography: TextStyles;
  onStartSessionPress: () => void;
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
          disabled
        />
        <QuickCaptureTile
          typography={typography}
          iconCircleColor={color('Semantic/Activity/Material')}
          icon={<QuickCaptureNewMaterialIcon color={bg.surfaceWhite} size={20} />}
          line1="NEW"
          line2="MATERIAL"
          disabled
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

function ChooseJobStepContent({
  typography,
  recentJobs,
  recentJobsLoading,
  recentJobsError,
  actionError,
  starting,
  onBack,
  onSelectExistingJob,
  onStartNewSession,
}: {
  typography: TextStyles;
  recentJobs: QuickActionsRecentJob[];
  recentJobsLoading: boolean;
  recentJobsError: string | null;
  actionError: string | null;
  starting: boolean;
  onBack: () => void;
  onSelectExistingJob: (job: QuickActionsRecentJob) => void;
  onStartNewSession: () => void;
}) {
  const showFetchError = recentJobsError != null && recentJobsError.length > 0;
  const showActionError = actionError != null && actionError.length > 0;

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
        Start Session
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start New Session"
        disabled={starting}
        onPress={onStartNewSession}
        style={({ pressed }) => [
          styles.primaryRow,
          {
            backgroundColor: color('Brand/Primary'),
            borderColor: border.subtle,
          },
          pressed && !starting ? styles.pressed : null,
          starting ? { opacity: 0.85 } : null,
        ]}
      >
        <View style={styles.primaryRowLeading}>
          <SessionChooserRowPlayIcon color={fg.muted} />
        </View>
        <View style={styles.primaryRowTextStack}>
          <Text style={[typography.bodyBold, { color: fg.muted }]} numberOfLines={1}>
            Start New Session
          </Text>
          <Text style={[typography.bodySmall, { color: fg.muted }]} numberOfLines={2}>
            Begin tracking now — add job details later
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
              disabled={starting}
              onPress={() => onSelectExistingJob(job)}
              style={({ pressed }) => [
                styles.jobRow,
                {
                  borderColor: border.subtle,
                  backgroundColor: bg.surfaceWhite,
                },
                pressed && !starting ? styles.pressed : null,
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
