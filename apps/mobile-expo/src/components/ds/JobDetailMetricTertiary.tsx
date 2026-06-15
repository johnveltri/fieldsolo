import { StyleSheet, Text, View } from 'react-native';
import { color, radius, space } from '@fieldsolo/design-system/lib/tokens';
import type { JobDetailViewModel } from '@fieldsolo/shared-types';

import {
  bg,
  border,
  CONTENT_MAX_WIDTH,
  fg,
} from '../../theme/nativeTokens';
import type { TextStyles } from '../../theme/nativeTokens';

export function JobDetailMetricTertiary({
  metrics,
  typography,
}: {
  metrics: JobDetailViewModel['metrics'];
  typography: TextStyles;
}) {
  const success = color('Semantic/Financial/Positive');

  return (
    <View style={[styles.metricCard, { maxWidth: CONTENT_MAX_WIDTH }]}>
      <View style={styles.metricTertiaryRow}>
        <View style={styles.metricColEqual}>
          <Text style={typography.jobDetailMetricColumnLabel}>TIME</Text>
          <Text
            style={[typography.metric, styles.metricValueCentered, { textTransform: 'none' }]}
            numberOfLines={2}
          >
            {metrics.timeLabel}
          </Text>
        </View>
        <View style={styles.metricColEqual}>
          <Text style={typography.jobDetailMetricColumnLabel}>NET/HR</Text>
          <View style={styles.netHrValue}>
            <Text
              style={[typography.metric, { color: success, textAlign: 'center', textTransform: 'none' }]}
              numberOfLines={2}
            >
              {`$ ${metrics.netPerHrDisplay}`}
            </Text>
          </View>
        </View>
        <View style={styles.metricColEqual}>
          <Text style={typography.jobDetailMetricColumnLabel}>SESSIONS</Text>
          <Text
            style={[typography.metric, styles.metricValueCentered, { textTransform: 'none' }]}
            numberOfLines={2}
          >
            {String(metrics.sessionCount)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metricCard: {
    width: '100%',
    backgroundColor: bg.surface,
    borderRadius: radius('Radius/16'),
    borderWidth: 1,
    borderColor: border.subtle,
    paddingHorizontal: space('Spacing/8'),
    paddingVertical: space('Spacing/16'),
  },
  metricTertiaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    width: '100%',
  },
  metricColEqual: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: space('Spacing/4'),
  },
  metricValueCentered: {
    textAlign: 'center',
    color: fg.primary,
  },
  netHrValue: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
