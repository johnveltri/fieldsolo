import { StyleSheet, Text, View } from 'react-native';

import { color, colorWithAlpha, radius, space } from '@fieldbook/design-system/lib/tokens';

import { bg, cardShadowRn, type TextStyles } from '../../theme/nativeTokens';

export type MetricSnapshotCardProps = {
  label: string;
  value: string;
  valueTone: 'success' | 'neutral';
  typography: TextStyles;
};

/**
 * Home weekly snapshot — large NET EARNINGS card (Figma `1931:2046`).
 */
export function MetricSnapshotCard({ label, value, valueTone, typography }: MetricSnapshotCardProps) {
  const valueColor =
    valueTone === 'success' ? color('Semantic/Status/Success/Text') : color('Foundation/Text/Primary');

  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={`${label} ${value}`}
    >
      <View style={styles.primary}>
        <Text style={[typography.labelCaps, styles.label, { color: color('Foundation/Text/Secondary') }]}>
          {label}
        </Text>
        <Text style={[typography.metricXL, styles.value, { color: valueColor }]}>{value}</Text>
      </View>
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
});
