import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, colorWithAlpha, radius, space } from '@fieldsolo/design-system/lib/tokens';

import { bg, border, cardShadowRn, fg, type TextStyles } from '../../theme/nativeTokens';

export type RankedJobRowCardProps = {
  /** 1-based rank shown in the leading badge. */
  rank: number;
  title: string;
  subtitle: string | null;
  /** Pre-formatted trailing value, e.g. `$100` or `$100/hr`. */
  value: string;
  typography: TextStyles;
  onPress: () => void;
};

/**
 * Ranked job row — numbered leading badge with trailing metric (Figma `786:106`).
 */
export function RankedJobRowCard({
  rank,
  title,
  subtitle,
  value,
  typography,
  onPress,
}: RankedJobRowCardProps) {
  const success = color('Semantic/Status/Success/Text');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Rank ${rank}. ${title}${subtitle ? `. ${subtitle}` : ''}. ${value}.`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.main}>
        <View style={styles.badge}>
          <Text
            style={[typography.metric, styles.badgeText, { color: fg.secondary, textTransform: 'none' }]}
          >
            {rank}
          </Text>
        </View>
        <View style={styles.titleStack}>
          <Text style={[typography.bodyBold, { color: fg.primary }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle != null && subtitle !== '' ? (
            <Text style={[typography.bodySmall, { color: fg.secondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.trailing}>
        <Text style={[typography.bodyBold, { color: success }]} numberOfLines={1}>
          {value}
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
    backgroundColor: bg.surfaceWhite,
    borderWidth: 1,
    borderColor: colorWithAlpha('Foundation/Border/Default', 0.1),
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
    backgroundColor: color('Semantic/Status/Neutral/BG'),
    borderWidth: 1,
    borderColor: border.subtle,
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
