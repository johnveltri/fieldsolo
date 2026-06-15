import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { color } from '@fieldsolo/design-system/lib/tokens';

import { fg, space, TOP_HEADER_MAX_WIDTH, type TextStyles } from '../../theme/nativeTokens';

export type SectionHeaderTone = 'neutral' | 'accent';

export type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  leadingIcon?: ReactNode;
  tone: SectionHeaderTone;
  typography: TextStyles;
};

/**
 * Home / section title row — Figma Home `1933:1403`, `810:612`, `1931:2187`.
 */
export function SectionHeader({ title, subtitle, leadingIcon, tone, typography }: SectionHeaderProps) {
  const titleColor = tone === 'accent' ? color('Brand/Accent') : fg.secondary;

  return (
    <View
      style={styles.root}
      accessibilityRole="header"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
    >
      <View style={styles.headingRow}>
        {leadingIcon != null ? <View style={styles.leadingSlot}>{leadingIcon}</View> : null}
        <Text style={[typography.metricS, { color: titleColor }, styles.titleFlex]} numberOfLines={2}>
          {title}
        </Text>
      </View>
      {subtitle != null && subtitle !== '' ? (
        <View style={[styles.subtitleBlock, leadingIcon != null && styles.subtitleWithIcon]}>
          <Text style={[typography.bodySmall, { color: fg.secondary }]}>{subtitle}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    maxWidth: TOP_HEADER_MAX_WIDTH,
    paddingTop: space('Spacing/36'),
    paddingBottom: space('Spacing/16'),
    paddingHorizontal: space('Spacing/20'),
    gap: 4,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/8'),
    width: '100%',
  },
  leadingSlot: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleFlex: {
    flex: 1,
    minWidth: 0,
  },
  subtitleBlock: {
    paddingVertical: 1,
  },
  subtitleWithIcon: {
    paddingLeft: 24,
  },
});
