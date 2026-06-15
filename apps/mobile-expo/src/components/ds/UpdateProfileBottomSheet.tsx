import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { color, radius, space } from '@fieldsolo/design-system/lib/tokens';

import { bg, border, fg } from '../../theme/nativeTokens';
import type { TextStyles } from '../../theme/nativeTokens';
import { SessionSheetBackIcon } from '../figma-icons/JobDetailScreenIcons';
import { ProfilePersonalInfoIcon } from '../figma-icons/ProfileScreenIcons';
import { BottomSheetShell } from './BottomSheetShell';
import { formatTradesForDisplay } from '../../lib/trades';

export type UpdateProfileValues = {
  firstName: string;
  lastName: string;
  /** Multi-select trades, each entry is a free text label. */
  trades: string[];
};

type UpdateProfileBottomSheetProps = {
  typography: TextStyles;
  visible: boolean;
  /** Read-only — pre-filled with `session.user.email`. Always rendered disabled. */
  email: string | null;
  values: UpdateProfileValues;
  saving?: boolean;
  onClose?: () => void;
  onClosed?: () => void;
  onBack?: () => void;
  onSave: (values: UpdateProfileValues) => void;
  /**
   * Lifts the current in-sheet draft into the parent so it can swap to the
   * trade multi-select sheet without losing typed first/last edits when the
   * sheet remounts on return.
   */
  onTradesPress: (current: UpdateProfileValues) => void;
  /** @default true — set false when this sheet replaces another (e.g. live session) without stacking. */
  registerInGlobalStack?: boolean;
};

function DropdownCaret() {
  return (
    <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
      <Path
        d="M2 3.5L5 6.5L8 3.5"
        stroke={fg.secondary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Update Profile sheet (Figma `1924:2211`).
 *
 * Layout (top → bottom):
 *   Back
 *   [user]  Update Profile
 *   [ First Name ]
 *   [ Last Name ]
 *   [ Email (read-only) ]
 *   [ Trades ▾ ]
 *   [ SAVE CHANGES                    ]
 *
 * The Trades pressable shows the comma-joined `values.trades` (or a
 * "Select trades" placeholder when empty). Pressing it lifts the current
 * draft into the parent via `onTradesPress(currentDraft)` so the parent
 * can render the `TradeMultiSelectBottomSheet`.
 *
 * Local state resets on the visible→true edge to mirror the
 * `EditMaterialBottomSheet` pattern. The parent owns the canonical draft so
 * it can re-seed `values` after a trade-picker round-trip.
 */
export function UpdateProfileBottomSheet({
  typography,
  visible,
  email,
  values,
  saving = false,
  onClose,
  onClosed,
  onBack,
  onSave,
  onTradesPress,
  registerInGlobalStack = true,
}: UpdateProfileBottomSheetProps) {
  const [firstName, setFirstName] = useState(values.firstName);
  const [lastName, setLastName] = useState(values.lastName);

  useEffect(() => {
    if (!visible) return;
    setFirstName(values.firstName);
    setLastName(values.lastName);
  }, [visible, values.firstName, values.lastName]);

  const accent = color('Brand/Primary');

  const draft = (): UpdateProfileValues => ({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    trades: values.trades,
  });

  const tradesLabel = formatTradesForDisplay(values.trades);
  const tradesIsPlaceholder = values.trades.length === 0;

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

        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <ProfilePersonalInfoIcon color={color('Brand/Accent')} />
          </View>
          <Text
            style={[typography.titleH3, styles.headerTitle, { color: fg.primary }]}
            numberOfLines={1}
          >
            Update Profile
          </Text>
        </View>

        <View style={styles.fields}>
          <View style={styles.inputShell}>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First Name"
              placeholderTextColor={fg.secondary}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!saving}
              style={[typography.body, styles.inputText]}
            />
          </View>
          <View style={styles.inputShell}>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last Name"
              placeholderTextColor={fg.secondary}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!saving}
              style={[typography.body, styles.inputText]}
            />
          </View>
          <View style={[styles.inputShell, styles.inputShellDisabled]}>
            {/* Email is read-only — render as disabled TextInput so layout / font match. */}
            <TextInput
              value={email ?? ''}
              editable={false}
              placeholder="Email"
              placeholderTextColor={fg.secondary}
              style={[typography.body, styles.inputText, { color: fg.secondary }]}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose trades"
            onPress={() => onTradesPress(draft())}
            disabled={saving}
            style={({ pressed }) => [
              styles.inputShell,
              styles.tradeShell,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                typography.body,
                {
                  color: tradesIsPlaceholder ? fg.secondary : fg.primary,
                  flex: 1,
                  minWidth: 0,
                },
              ]}
              numberOfLines={2}
            >
              {tradesIsPlaceholder ? 'Select trades' : tradesLabel}
            </Text>
            <DropdownCaret />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="SAVE CHANGES"
          accessibilityState={{ disabled: saving }}
          onPress={saving ? undefined : () => onSave(draft())}
          disabled={saving}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: accent, shadowColor: accent },
            saving && styles.primaryDisabled,
            pressed && !saving && styles.pressed,
          ]}
        >
          <Text style={[typography.ctaPrimaryLabel, styles.primaryLabel]}>
            SAVE CHANGES
          </Text>
        </Pressable>
      </View>
    </BottomSheetShell>
  );
}

const styles = StyleSheet.create({
  body: {
    width: '100%',
    gap: space('Spacing/16'),
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/4'),
    alignSelf: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/12'),
  },
  headerIcon: {
    width: space('Spacing/16'),
    height: space('Spacing/16'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
  },
  fields: {
    gap: space('Spacing/8'),
  },
  inputShell: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: radius('Radius/8'),
    backgroundColor: bg.surfaceWhite,
    paddingHorizontal: 13,
    paddingVertical: 9,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputShellDisabled: {
    backgroundColor: bg.subtle,
  },
  inputText: {
    color: fg.primary,
    padding: 0,
    width: '100%',
  },
  tradeShell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space('Spacing/8'),
  },
  primary: {
    minHeight: space('Spacing/50'),
    borderRadius: radius('Radius/12'),
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  primaryDisabled: {
    opacity: 0.45,
  },
  primaryLabel: {
    color: color('Foundation/Surface/White'),
  },
  pressed: {
    opacity: 0.8,
  },
});
