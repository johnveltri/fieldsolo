import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { color } from '@fieldsolo/design-system/lib/tokens';

import {
  type TextStyles,
  TOP_HEADER_MAX_WIDTH,
  fg,
  space,
} from '../../theme/nativeTokens';

export const JOBS_OPEN_SECTION_KINDS = ['incomplete', 'inProgress', 'unpaid'] as const;
export type JobsOpenSectionKind = (typeof JOBS_OPEN_SECTION_KINDS)[number];

const COPY: Record<
  JobsOpenSectionKind,
  { titlePrefix: string; subtitle: string }
> = {
  incomplete: { titlePrefix: 'INCOMPLETE', subtitle: 'Missing key info' },
  inProgress: { titlePrefix: 'IN PROGRESS', subtitle: 'Active work underway' },
  unpaid: { titlePrefix: 'UNPAID', subtitle: 'Completed but not paid' },
};

const TITLE_COLORS: Record<JobsOpenSectionKind, string> = {
  incomplete: color('Semantic/Status/Warning/Text'),
  inProgress: color('Semantic/Status/Info/Text'),
  unpaid: color('Semantic/Status/Neutral/Text'),
};

function LeadingIncomplete({ stroke }: { stroke: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" accessibilityElementsHidden>
      <Path
        d="M7 1.75L12.25 12H1.75L7 1.75Z"
        stroke={stroke}
        strokeWidth={1.2}
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M7 5.25V7.75" stroke={stroke} strokeWidth={1.2} strokeLinecap="round" />
      <Path d="M7 9.25h.01" stroke={stroke} strokeWidth={1.2} strokeLinecap="round" />
    </Svg>
  );
}

function LeadingInProgress({ fill }: { fill: string }) {
  return (
    <View
      style={[styles.leadingDot, { backgroundColor: fill }]}
      accessibilityElementsHidden
    />
  );
}

function LeadingUnpaid({ borderColor }: { borderColor: string }) {
  return (
    <View
      style={[styles.leadingRing, { borderColor }]}
      accessibilityElementsHidden
    />
  );
}

/**
 * OPEN-tab list section header — Figma: Incomplete `443:2253`, In progress `1022:456`, Unpaid `1022:468`.
 * @see fieldsolo/packages/design-system/components/jobs-open-stack-section-header/spec.json
 */
export function JobsOpenStackSectionHeader({
  kind,
  count,
  typography,
}: {
  kind: JobsOpenSectionKind;
  count: number;
  typography: TextStyles;
}) {
  const titleColor = TITLE_COLORS[kind];
  const { titlePrefix, subtitle } = COPY[kind];
  const titleLine = `${titlePrefix} · ${count}`;

  const leading =
    kind === 'incomplete' ? (
      <LeadingIncomplete stroke={titleColor} />
    ) : kind === 'inProgress' ? (
      <LeadingInProgress fill={titleColor} />
    ) : (
      <LeadingUnpaid borderColor={fg.secondary} />
    );

  return (
    <View
      style={styles.root}
      accessibilityRole="header"
      accessibilityLabel={`${titleLine}. ${subtitle}`}
    >
      <View style={styles.headingRow}>
        <View style={styles.leadingSlot}>{leading}</View>
        <Text style={[typography.metricS, styles.title, { color: titleColor }]} numberOfLines={1}>
          {titleLine}
        </Text>
      </View>
      <View style={styles.subtitleBlock}>
        <Text style={[typography.bodySmall, { color: titleColor }]}>{subtitle}</Text>
      </View>
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
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadingDot: {
    width: 14,
    height: 14,
    borderRadius: 9999,
  },
  leadingRing: {
    width: 14,
    height: 14,
    borderRadius: 9999,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  subtitleBlock: {
    paddingLeft: 22,
    paddingRight: 22,
    paddingVertical: 1,
  },
});
