import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, colorWithAlpha, radius, space } from '@fieldbook/design-system/lib/tokens';

import { cardShadowRn, type TextStyles } from '../../theme/nativeTokens';

export type WorkedNotMarkedCompleteRowCardProps = {
  title: string;
  typography: TextStyles;
  onPress: () => void;
};

/**
 * Home “Needs attention” — worked sessions but job not marked complete (info surface).
 */
export function WorkedNotMarkedCompleteRowCard({
  title,
  typography,
  onPress,
}: WorkedNotMarkedCompleteRowCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. Worked: Not marked complete. Review`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.main}>
        <View style={styles.titleStack}>
          <Text style={[typography.bodyBold, styles.title]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[typography.bodySmall, styles.subtitle]} numberOfLines={1}>
            Worked: Not marked complete
          </Text>
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
    backgroundColor: color('Semantic/Status/Info/BG'),
    borderWidth: 1,
    borderColor: colorWithAlpha('Semantic/Status/Info/Text', 0.22),
    borderRadius: radius('Radius/16'),
    ...cardShadowRn,
  },
  main: {
    flex: 1,
    minWidth: 0,
    marginRight: space('Spacing/8'),
  },
  titleStack: {
    gap: space('Spacing/4'),
  },
  title: {
    color: color('Foundation/Text/Primary'),
  },
  subtitle: {
    color: color('Semantic/Status/Info/Text'),
  },
  trailing: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  reviewLink: {
    color: color('Semantic/Status/Info/Text'),
  },
  pressed: { opacity: 0.75 },
});
