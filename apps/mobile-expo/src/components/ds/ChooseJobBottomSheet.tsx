import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { color, radius, space } from '@fieldsolo/design-system/lib/tokens';

import { bg, border, fg } from '../../theme/nativeTokens';
import type { TextStyles } from '../../theme/nativeTokens';
import { SessionSheetBackIcon } from '../figma-icons/JobDetailScreenIcons';
import { BottomSheetShell } from './BottomSheetShell';

export type ChooseJobBottomSheetJob = {
  id: string;
  shortDescription: string;
  customerName: string | null;
};

type ChooseJobBottomSheetProps = {
  typography: TextStyles;
  visible: boolean;
  jobs: ChooseJobBottomSheetJob[];
  loading?: boolean;
  error?: string | null;
  onClose?: () => void;
  onClosed?: () => void;
  onBack?: () => void;
  onSelect: (jobId: string) => void;
  /** Disable rows while an assign mutation is in flight. */
  busy?: boolean;
  /** @default true — set false when this sheet replaces another without stacking. */
  registerInGlobalStack?: boolean;
};

/**
 * "Add to Job" bottom sheet (Figma `1940:2591`). A scrollable list of the
 * user's jobs used to assign an Inbox / quick-capture note or material to a
 * job. Consumers supply an already-mapped job list so this sheet has no data
 * concerns of its own.
 */
export function ChooseJobBottomSheet({
  typography,
  visible,
  jobs,
  loading = false,
  error = null,
  onClose,
  onClosed,
  onBack,
  onSelect,
  busy = false,
  registerInGlobalStack = true,
}: ChooseJobBottomSheetProps) {
  const showError = error != null && error.length > 0;
  return (
    <BottomSheetShell
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      registerInGlobalStack={registerInGlobalStack}
    >
      <View style={styles.body}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack ?? onClose}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <SessionSheetBackIcon color={fg.secondary} />
          <Text style={[typography.bodyBold, { color: fg.secondary }]}>Back</Text>
        </Pressable>

        <Text
          style={[typography.titleH3, styles.title, { color: fg.primary }]}
          numberOfLines={1}
        >
          Add to Job
        </Text>

        {showError ? (
          <Text
            style={[typography.bodySmall, styles.inlineError, { color: color('Semantic/Status/Error/Text') }]}
          >
            {error}
          </Text>
        ) : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={color('Brand/Primary')} />
          </View>
        ) : jobs.length === 0 ? (
          <View style={styles.loadingWrap}>
            <Text style={[typography.body, { color: fg.secondary, textAlign: 'center' }]}>
              No jobs yet.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {jobs.map((job) => (
              <Pressable
                key={job.id}
                accessibilityRole="button"
                accessibilityLabel={`Add to job ${job.shortDescription}`}
                disabled={busy}
                onPress={() => onSelect(job.id)}
                style={({ pressed }) => [styles.row, pressed && !busy ? styles.pressed : null]}
              >
                <View style={styles.rowTextStack}>
                  <Text style={[typography.bodyBold, { color: fg.primary }]} numberOfLines={1}>
                    {job.shortDescription.trim() || 'Untitled Job'}
                  </Text>
                  <Text style={[typography.bodySmall, { color: fg.secondary }]} numberOfLines={1}>
                    {(job.customerName ?? '').trim() || 'No customer'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </BottomSheetShell>
  );
}

const styles = StyleSheet.create({
  body: {
    width: '100%',
    gap: space('Spacing/16'),
    maxHeight: 460,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/4'),
    alignSelf: 'flex-start',
  },
  title: {
    textAlign: 'center',
  },
  inlineError: {
    textAlign: 'center',
  },
  loadingWrap: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listScroll: {
    width: '100%',
  },
  listContent: {
    gap: space('Spacing/12'),
    paddingBottom: space('Spacing/8'),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: space('Spacing/74'),
    paddingHorizontal: space('Spacing/20'),
    paddingVertical: space('Spacing/16'),
    borderRadius: radius('Radius/16'),
    borderWidth: 1,
    borderColor: border.subtle,
    backgroundColor: bg.surfaceWhite,
    shadowColor: color('Foundation/Text/Primary'),
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  rowTextStack: {
    flex: 1,
    minWidth: 0,
    gap: space('Spacing/4'),
  },
  pressed: {
    opacity: 0.8,
  },
});
