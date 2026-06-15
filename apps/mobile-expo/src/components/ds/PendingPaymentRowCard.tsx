import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, colorWithAlpha, radius, space } from '@fieldsolo/design-system/lib/tokens';

import { cardShadowRn, type TextStyles } from '../../theme/nativeTokens';

export type PendingPaymentRowCardProps = {
  title: string;
  typography: TextStyles;
  onPress: () => void;
};

/**
 * Home “Needs attention” — completed job with pending payment (Figma `1937:1812`).
 */
export function PendingPaymentRowCard({
  title,
  typography,
  onPress,
}: PendingPaymentRowCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. Completed: Pending payment. Review`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.main}>
        <View style={styles.titleStack}>
          <Text style={[typography.bodyBold, styles.title]} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.detailRow}>
            <Text style={[typography.bodySmall, styles.detailText]}>Completed:</Text>
            <Text style={[typography.bodySmall, styles.detailText]} numberOfLines={1}>
              Pending payment
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.trailing}>
        <Text style={[typography.bodyBold, styles.reviewLink]}>Review →</Text>
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
    backgroundColor: color('Semantic/Status/Neutral/BG'),
    borderWidth: 1,
    borderColor: colorWithAlpha('Foundation/Border/Default', 0.1),
    borderRadius: radius('Radius/16'),
    ...cardShadowRn,
  },
  main: {
    flex: 1,
    minWidth: 0,
    marginRight: space('Spacing/12'),
  },
  titleStack: {
    gap: space('Spacing/4'),
  },
  title: {
    color: color('Foundation/Text/Primary'),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: space('Spacing/4'),
  },
  detailText: {
    color: color('Semantic/Status/Neutral/Text'),
  },
  trailing: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  reviewLink: {
    color: color('Semantic/Status/Neutral/Text'),
  },
  pressed: { opacity: 0.75 },
});
