import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius, space } from '@fieldsolo/design-system/lib/tokens';

import { cardShadowRn, fg, type TextStyles } from '../../theme/nativeTokens';

export type OutstandingPaymentCardProps = {
  /** Number of jobs pending payment. */
  count: number;
  /** Pre-formatted total owed, e.g. `$4,234.00`. */
  amount: string;
  typography: TextStyles;
  onPress: () => void;
};

/**
 * Outstanding jobs pending payment — warning row card (Figma `786:55`).
 */
export function OutstandingPaymentCard({
  count,
  amount,
  typography,
  onPress,
}: OutstandingPaymentCardProps) {
  const warningText = color('Semantic/Status/Warning/Text');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Outstanding. ${count} jobs pending payment. ${amount}.`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.main}>
        <View style={styles.badge}>
          <Text style={[typography.metric, styles.badgeText, { color: fg.muted, textTransform: 'none' }]}>
            {count}
          </Text>
        </View>
        <View style={styles.titleStack}>
          <Text style={[typography.bodyBold, { color: fg.primary }]} numberOfLines={1}>
            Outstanding
          </Text>
          <Text style={[typography.bodySmall, { color: warningText }]} numberOfLines={1}>
            Jobs pending payment
          </Text>
        </View>
      </View>
      <View style={styles.trailing}>
        <Text style={[typography.metric, { color: warningText, textTransform: 'none' }]} numberOfLines={1}>
          {amount}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    maxWidth: 353,
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space('Spacing/20'),
    paddingVertical: space('Spacing/16'),
    backgroundColor: color('Semantic/Status/Warning/BG'),
    borderWidth: 1,
    borderColor: color('Semantic/Status/Warning/Stroke'),
    borderRadius: radius('Radius/16'),
    ...cardShadowRn,
  },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/12'),
    marginRight: space('Spacing/12'),
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radius('Radius/Full'),
    backgroundColor: color('Semantic/Status/Warning/Text'),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeText: {
    textAlign: 'center',
  },
  titleStack: {
    flex: 1,
    minWidth: 0,
    gap: space('Spacing/4'),
  },
  trailing: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },
});
