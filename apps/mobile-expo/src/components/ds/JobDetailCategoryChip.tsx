import { StyleSheet, Text, View } from 'react-native';
import { color, radius, space } from '@fieldsolo/design-system/lib/tokens';

import type { TextStyles } from '../../theme/nativeTokens';

export function JobDetailCategoryChip({
  labelUppercase,
  typography,
}: {
  labelUppercase: string;
  typography: TextStyles;
}) {
  return (
    <View style={styles.chip}>
      <Text style={[typography.jobDetailCategoryLabel, { textTransform: 'none' }]}>
        {labelUppercase}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    backgroundColor: color('Foundation/Text/Primary'),
    paddingHorizontal: space('Spacing/8'),
    paddingVertical: space('Spacing/4'),
    borderRadius: radius('Radius/Full'),
  },
});
