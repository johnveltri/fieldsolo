import { StyleSheet, Text, View } from 'react-native';

import { color, colorWithAlpha, radius, space } from '@fieldbook/design-system/lib/tokens';

import { bg, cardShadowRn, fg, type TextStyles } from '../../theme/nativeTokens';

export type EarningsSnapshotCardProps = {
  /** Pre-formatted currency, e.g. `$242,608.00`. */
  netEarnings: string;
  /** Pre-formatted currency, e.g. `$639,375.00`. */
  revenue: string;
  /** Pre-formatted currency with sign, e.g. `-$148,767.00`. */
  materials: string;
  /** Pre-formatted hours, e.g. `102.0h`. */
  time: string;
  /** Pre-formatted net/hr, e.g. `$6,337/hr` or `—`. */
  netPerHr: string;
  /** Pre-formatted job count, e.g. `239`. */
  jobs: string;
  typography: TextStyles;
};

/**
 * Earnings snapshot — 3-row metric card (Figma `258:1457`): hero NET EARNINGS,
 * REVENUE / MATERIALS row, then TIME / NET/HR / JOBS row.
 */
export function EarningsSnapshotCard({
  netEarnings,
  revenue,
  materials,
  time,
  netPerHr,
  jobs,
  typography,
}: EarningsSnapshotCardProps) {
  const success = color('Semantic/Status/Success/Text');
  const brand = color('Brand/Primary');

  return (
    <View
      style={styles.card}
      accessibilityRole="summary"
      accessibilityLabel={`Net earnings ${netEarnings}. Revenue ${revenue}. Materials ${materials}. Time ${time}. Net per hour ${netPerHr}. Jobs ${jobs}.`}
    >
      <View style={styles.primary}>
        <Text style={[typography.labelHeadingSecondary, styles.center]}>NET EARNINGS</Text>
        <Text style={[typography.metricXL, styles.center, { color: success }]} numberOfLines={1}>
          {netEarnings}
        </Text>
      </View>

      <View style={styles.row}>
        <View style={styles.colStart}>
          <Text style={typography.labelHeadingSecondary}>REVENUE</Text>
          <Text style={[typography.metric, { color: fg.primary, textTransform: 'none' }]} numberOfLines={1}>
            {revenue}
          </Text>
        </View>
        <View style={styles.colEnd}>
          <Text style={[typography.labelHeadingSecondary, styles.alignRight]}>MATERIALS</Text>
          <Text
            style={[typography.metric, styles.alignRight, { color: brand, textTransform: 'none' }]}
            numberOfLines={1}
          >
            {materials}
          </Text>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.colStart}>
          <Text style={typography.labelHeadingSecondary}>TIME</Text>
          <Text style={[typography.metric, { color: fg.primary, textTransform: 'none' }]} numberOfLines={1}>
            {time}
          </Text>
        </View>
        <View style={styles.colCenter}>
          <Text style={[typography.labelHeadingSecondary, styles.center]}>NET/HR</Text>
          <Text
            style={[typography.metric, styles.center, { color: success, textTransform: 'none' }]}
            numberOfLines={1}
          >
            {netPerHr}
          </Text>
        </View>
        <View style={styles.colEnd}>
          <Text style={[typography.labelHeadingSecondary, styles.alignRight]}>JOBS</Text>
          <Text
            style={[typography.metric, styles.alignRight, { color: fg.primary, textTransform: 'none' }]}
            numberOfLines={1}
          >
            {jobs}
          </Text>
        </View>
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
    gap: space('Spacing/4'),
    ...cardShadowRn,
  },
  primary: {
    alignItems: 'center',
    gap: space('Spacing/4'),
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colorWithAlpha('Foundation/Border/Default', 0.1),
    paddingVertical: space('Spacing/8'),
  },
  colStart: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: space('Spacing/4'),
  },
  colCenter: {
    paddingHorizontal: space('Spacing/12'),
    alignItems: 'center',
    gap: space('Spacing/4'),
  },
  colEnd: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: space('Spacing/4'),
  },
  center: {
    textAlign: 'center',
  },
  alignRight: {
    textAlign: 'right',
  },
});
