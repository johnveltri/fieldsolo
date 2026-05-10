import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, radius, space } from '@fieldbook/design-system/lib/tokens';

import { cardShadowRn, type TextStyles } from '../../theme/nativeTokens';

export type IncompleteJobRowCardProps = {
  title: string;
  missingFields: string[];
  typography: TextStyles;
  onPress: () => void;
};

/**
 * “Needs attention” job row — warning surface (Figma `786:29` Incomplete Job variant).
 */
export function IncompleteJobRowCard({
  title,
  missingFields,
  typography,
  onPress,
}: IncompleteJobRowCardProps) {
  const missingLine = missingFields.length > 0 ? missingFields.join(', ') : '—';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. Missing ${missingLine}. Fix`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.main}>
        <View style={styles.titleStack}>
          <Text style={[typography.bodyBold, styles.title]} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.missingRow}>
            <Text style={[typography.bodySmall, styles.missingPrefix]}>Missing:</Text>
            <Text
              style={[typography.bodySmall, styles.missingDetail]}
              numberOfLines={1}
            >
              {missingLine}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.trailing}>
        <Text style={[typography.bodyBold, styles.fixLink]}>Fix →</Text>
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
    marginRight: space('Spacing/8'),
  },
  titleStack: {
    gap: space('Spacing/4'),
  },
  title: {
    color: color('Foundation/Text/Primary'),
  },
  missingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space('Spacing/4'),
  },
  missingPrefix: {
    color: color('Semantic/Status/Error/Text'),
  },
  missingDetail: {
    flex: 1,
    minWidth: 0,
    color: color('Semantic/Status/Error/Text'),
  },
  trailing: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  fixLink: {
    color: color('Semantic/Status/Error/Text'),
  },
  pressed: { opacity: 0.75 },
});
