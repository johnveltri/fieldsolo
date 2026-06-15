import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, colorWithAlpha, radius, space } from '@fieldsolo/design-system/lib/tokens';

import { bg, cardShadowRn, type TextStyles } from '../../theme/nativeTokens';

export type MetricSnapshotCardProps = {
  label: string;
  value: string;
  valueTone: 'success' | 'neutral';
  typography: TextStyles;
  /** When provided, the card becomes a button that navigates on press. */
  onPress?: () => void;
};

/**
 * Home weekly snapshot — large NET EARNINGS card (Figma `1931:2046`).
 */
export function MetricSnapshotCard({
  label,
  value,
  valueTone,
  typography,
  onPress,
}: MetricSnapshotCardProps) {
  const valueColor =
    valueTone === 'success' ? color('Semantic/Status/Success/Text') : color('Foundation/Text/Primary');

  const inner = (
    <View style={styles.primary}>
      <Text style={[typography.labelCaps, styles.label, { color: color('Foundation/Text/Secondary') }]}>
        {label}
      </Text>
      <Text style={[typography.metricXL, styles.value, { color: valueColor }]}>{value}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${value}`}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={styles.card} accessibilityRole="summary" accessibilityLabel={`${label} ${value}`}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 353,
    backgroundColor: bg.surfaceWhite,
    borderWidth: 1,
    borderColor: colorWithAlpha('Foundation/Border/Default', 0.1),
    borderRadius: radius('Radius/24'),
    padding: space('Spacing/32'),
    ...cardShadowRn,
  },
  primary: {
    alignItems: 'center',
    gap: space('Spacing/4'),
    width: '100%',
  },
  label: {
    textAlign: 'center',
  },
  value: {
    textAlign: 'center',
  },
  pressed: { opacity: 0.75 },
});
