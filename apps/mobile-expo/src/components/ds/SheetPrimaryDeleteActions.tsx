import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { color, radius, space } from '@fieldsolo/design-system/lib/tokens';

import { bg, border } from '../../theme/nativeTokens';
import type { TextStyles } from '../../theme/nativeTokens';

type SheetPrimaryDeleteActionsProps = {
  typography: TextStyles;
  primaryLabel: string;
  /** When true, primary button is dimmed and onPrimaryPress is not called. */
  primaryDisabled?: boolean;
  /** Background + shadow color for the primary button. Defaults to `Brand/Primary`. */
  primaryColor?: string;
  onPrimaryPress?: () => void;
  onDeletePress?: () => void;
};

function DeleteIcon() {
  return (
    <Svg width={14} height={16} viewBox="0 0 14 15.3333" fill="none">
      <Path
        d="M4.33333 3.66667V2.33333C4.33333 1.66667 5 1 5.66667 1H8.33333C9 1 9.66667 1.66667 9.66667 2.33333V3.66667M1 3.66667H13M11.6667 3.66667V13C11.6667 13.6667 11 14.3333 10.3333 14.3333H3.66667C3 14.3333 2.33333 13.6667 2.33333 13V3.66667M5.66667 7.02778V10.8611M8.33333 7.02778V10.8611"
        stroke={color('Brand/Primary')}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SheetPrimaryDeleteActions({
  typography,
  primaryLabel,
  primaryDisabled = false,
  primaryColor,
  onPrimaryPress,
  onDeletePress,
}: SheetPrimaryDeleteActionsProps) {
  const tint = primaryColor ?? color('Brand/Primary');
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
        accessibilityState={{ disabled: primaryDisabled }}
        onPress={primaryDisabled ? undefined : onPrimaryPress}
        disabled={primaryDisabled}
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: tint, shadowColor: tint },
          primaryDisabled && styles.primaryDisabled,
          pressed && !primaryDisabled && styles.pressed,
        ]}
      >
        <Text style={[typography.ctaPrimaryLabel, styles.primaryLabel]}>{primaryLabel}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete"
        onPress={onDeletePress}
        style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
      >
        <DeleteIcon />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/12'),
  },
  primary: {
    flex: 1,
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
  delete: {
    width: space('Spacing/50'),
    minHeight: space('Spacing/50'),
    borderRadius: radius('Radius/12'),
    borderWidth: 1,
    borderColor: border.subtle,
    backgroundColor: bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
