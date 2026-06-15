import { StyleSheet, Text, View } from 'react-native';
import { radius, space } from '@fieldsolo/design-system/lib/tokens';
import type { JobDetailWorkStatus } from '@fieldsolo/shared-types';

import { CONTENT_MAX_WIDTH } from '../../theme/nativeTokens';
import type { TextStyles } from '../../theme/nativeTokens';
import { JobDetailStatusPill } from './JobDetailStatusPill';

export function JobDetailJobHeader({
  title,
  customerName,
  serviceAddress,
  lastWorkedLabel,
  workStatus,
  typography,
}: {
  title: string;
  customerName: string;
  serviceAddress: string;
  lastWorkedLabel: string;
  workStatus: JobDetailWorkStatus;
  typography: TextStyles;
}) {
  const customerLabel = customerName.trim().length > 0 ? customerName.trim() : 'No Customer';
  const serviceAddressLabel = serviceAddress.trim();

  return (
    <View style={styles.jobCardShell}>
      <View style={styles.jobCardContent}>
        <View style={styles.jobTitlePillRow}>
          <Text style={[typography.headingH2, styles.jobTitleFlex]} numberOfLines={3}>
            {title}
          </Text>
          <View style={styles.statusPillAlign}>
            <JobDetailStatusPill kind={workStatus} typography={typography} />
          </View>
        </View>
        <Text style={typography.jobDetailSubtitle}>
          <Text>{customerLabel}</Text>
          <Text>{` • `}</Text>
          <Text>{lastWorkedLabel}</Text>
        </Text>
        {serviceAddressLabel.length > 0 ? (
          <Text style={typography.jobDetailSubtitle}>{serviceAddressLabel}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  jobCardShell: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    borderRadius: radius('Radius/16'),
  },
  jobCardContent: {
    paddingVertical: space('Spacing/16'),
    gap: space('Spacing/8'),
  },
  jobTitlePillRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space('Spacing/8'),
    width: '100%',
  },
  jobTitleFlex: {
    flex: 1,
    minWidth: 0,
  },
  statusPillAlign: {
    marginTop: space('Spacing/3'),
    flexShrink: 0,
  },
});
