import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { color, radius, space } from '@fieldsolo/design-system/lib/tokens';

import { bg, border, fg } from '../../theme/nativeTokens';
import type { TextStyles } from '../../theme/nativeTokens';
import { SessionSheetBackIcon } from '../figma-icons/JobDetailScreenIcons';
import { BottomSheetShell } from './BottomSheetShell';

export type ChooseSessionBottomSheetSession = {
  id: string;
  /** Title row (e.g. "Mar 25, 2026"). */
  dateLabel: string;
  /** Subtitle row (e.g. "9:00 AM – 10:00 AM"). */
  timeRangeLabel: string;
};

type ChooseSessionBottomSheetProps = {
  typography: TextStyles;
  visible: boolean;
  /**
   * - `attach`: title "Add to Session", no Remove row, renders full `sessions` list.
   * - `edit`:   title "Edit Session", Remove From Session row at top, divider
   *             "ATTACH TO DIFFERENT SESSION", list excludes `currentSessionId`.
   */
  mode: 'attach' | 'edit';
  sessions: ChooseSessionBottomSheetSession[];
  /** Required in `edit` mode so it can be filtered out of the list. */
  currentSessionId?: string | null;
  onClose?: () => void;
  onClosed?: () => void;
  onBack?: () => void;
  onSelect: (sessionId: string) => void;
  /** Only wired in `edit` mode. */
  onRemove?: () => void;
  /** @default true — set false when this sheet replaces another (e.g. live session) without stacking. */
  registerInGlobalStack?: boolean;
};

/**
 * Entity-agnostic "Choose a session" bottom sheet (Figma `1279:380` attach /
 * `1279:423` edit). Consumers pass an already-mapped list of sessions so the
 * sheet has no knowledge of what is being attached — reusable for notes,
 * materials, attachments, or any future flow that needs session picking.
 */
export function ChooseSessionBottomSheet({
  typography,
  visible,
  mode,
  sessions,
  currentSessionId,
  onClose,
  onClosed,
  onBack,
  onSelect,
  onRemove,
  registerInGlobalStack = true,
}: ChooseSessionBottomSheetProps) {
  const title = mode === 'edit' ? 'Edit Session' : 'Add to Session';
  const list =
    mode === 'edit' && currentSessionId
      ? sessions.filter((s) => s.id !== currentSessionId)
      : sessions;

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
          {title}
        </Text>

        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {mode === 'edit' ? (
            <>
              <RemoveFromSessionRow typography={typography} onPress={onRemove} />
              <DividerWithLabel label="ATTACH TO DIFFERENT SESSION" typography={typography} />
            </>
          ) : null}
          {list.map((s) => (
            <SessionRow
              key={s.id}
              typography={typography}
              session={s}
              onPress={() => onSelect(s.id)}
            />
          ))}
        </ScrollView>
      </View>
    </BottomSheetShell>
  );
}

function SessionRow({
  typography,
  session,
  onPress,
}: {
  typography: TextStyles;
  session: ChooseSessionBottomSheetSession;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${session.dateLabel} ${session.timeRangeLabel}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowTextStack}>
        <Text
          style={[typography.bodyBold, { color: fg.primary }]}
          numberOfLines={1}
        >
          {session.dateLabel}
        </Text>
        <Text
          style={[typography.bodySmall, { color: fg.secondary }]}
          numberOfLines={1}
        >
          {session.timeRangeLabel}
        </Text>
      </View>
    </Pressable>
  );
}

function RemoveFromSessionRow({
  typography,
  onPress,
}: {
  typography: TextStyles;
  onPress?: () => void;
}) {
  const errorText = color('Semantic/Status/Error/Text');
  const errorBg = color('Semantic/Status/Error/BG');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Remove from session"
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        styles.removeRow,
        { backgroundColor: errorBg },
        pressed && onPress ? styles.pressed : null,
      ]}
    >
      <View style={styles.rowTextStack}>
        <Text style={[typography.bodyBold, { color: errorText }]} numberOfLines={1}>
          Remove From Session
        </Text>
        <Text style={[typography.bodySmall, { color: fg.secondary }]} numberOfLines={1}>
          Save as unassigned — assign to a session later
        </Text>
      </View>
    </Pressable>
  );
}

function DividerWithLabel({
  label,
  typography,
}: {
  label: string;
  typography: TextStyles;
}) {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={[typography.labelHeadingSecondary, styles.dividerLabel]}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    width: '100%',
    gap: space('Spacing/16'),
    maxHeight: 420,
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
  removeRow: {
    minHeight: space('Spacing/80') + space('Spacing/4'),
  },
  rowTextStack: {
    flex: 1,
    minWidth: 0,
    gap: space('Spacing/4'),
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space('Spacing/12'),
    paddingVertical: space('Spacing/8'),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: border.subtle,
  },
  dividerLabel: {
    color: fg.secondary,
  },
  pressed: {
    opacity: 0.8,
  },
});
