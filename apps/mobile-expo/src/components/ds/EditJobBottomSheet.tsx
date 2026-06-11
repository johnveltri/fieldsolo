import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { TextStyles } from '../../theme/nativeTokens';
import { fg, border, space } from '../../theme/nativeTokens';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { BottomSheetShell } from './BottomSheetShell';
import { SheetPrimaryDeleteActions } from './SheetPrimaryDeleteActions';

export type EditJobBottomSheetValues = {
  shortDescription: string;
  customerName: string;
  serviceAddress: string;
  revenue: string;
};

type EditJobBottomSheetProps = {
  typography: TextStyles;
  values?: Partial<EditJobBottomSheetValues>;
  visible: boolean;
  onClose?: () => void;
  onClosed?: () => void;
  onSavePress?: (values: EditJobBottomSheetValues) => void;
  onDeletePress?: () => void;
};

const DEFAULT_VALUES: EditJobBottomSheetValues = {
  shortDescription: 'Bathroom Remodel Phase 1',
  customerName: 'Andrew G',
  serviceAddress: '123 Main Street, Perrysburg, OH 43551',
  revenue: '5,678.87',
};

function BackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M12.5 15L7.5 10L12.5 5"
        stroke={fg.secondary}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function InputShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <View style={styles.inputShell}>
      {children}
    </View>
  );
}

export function EditJobBottomSheet({
  typography,
  values,
  visible,
  onClose,
  onClosed,
  onSavePress,
  onDeletePress,
}: EditJobBottomSheetProps) {
  const v = { ...DEFAULT_VALUES, ...values };
  const [shortDescription, setShortDescription] = useState(v.shortDescription);
  const [customerName, setCustomerName] = useState(v.customerName);
  const [serviceAddress, setServiceAddress] = useState(v.serviceAddress);
  const [revenue, setRevenue] = useState(v.revenue);
  const shortDescriptionRef = useRef<TextInput>(null);
  const customerNameRef = useRef<TextInput>(null);
  const serviceAddressRef = useRef<TextInput>(null);
  const revenueRef = useRef<TextInput>(null);

  useEffect(() => {
    setShortDescription(v.shortDescription);
    setCustomerName(v.customerName);
    setServiceAddress(v.serviceAddress);
    setRevenue(v.revenue);
  }, [v.customerName, v.shortDescription, v.revenue, v.serviceAddress, visible]);

  return (
    <BottomSheetShell visible={visible} onClose={onClose} onClosed={onClosed}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <View style={styles.body}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onClose}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <BackIcon />
          <Text style={[typography.bodyBold, { color: fg.secondary }]}>Back</Text>
        </Pressable>

        <Text style={[typography.titleH3, { color: fg.primary }]}>Edit Job</Text>

        <View style={styles.fields}>
          <InputShell>
            <TextInput
              ref={shortDescriptionRef}
              value={shortDescription}
              onChangeText={setShortDescription}
              placeholder="Short description"
              placeholderTextColor={fg.secondary}
              editable
              showSoftInputOnFocus
              style={[typography.titleH3, styles.inputText]}
            />
          </InputShell>
          <InputShell>
            <TextInput
              ref={customerNameRef}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Customer name"
              placeholderTextColor={fg.secondary}
              editable
              showSoftInputOnFocus
              style={[typography.body, styles.inputText]}
            />
          </InputShell>
          <InputShell>
            <TextInput
              ref={serviceAddressRef}
              value={serviceAddress}
              onChangeText={setServiceAddress}
              placeholder="Service address"
              placeholderTextColor={fg.secondary}
              editable
              showSoftInputOnFocus
              style={[typography.body, styles.inputText]}
            />
          </InputShell>
          <InputShell>
            <View style={styles.revenueRow}>
              <Text style={[typography.bodyBold, { color: fg.primary }]}>$</Text>
              <TextInput
                ref={revenueRef}
                value={revenue}
                onChangeText={setRevenue}
                placeholder="Revenue"
                placeholderTextColor={fg.secondary}
                keyboardType="numeric"
                editable
                showSoftInputOnFocus
                style={[typography.body, styles.inputText, styles.revenueInput]}
              />
            </View>
          </InputShell>
        </View>

        <SheetPrimaryDeleteActions
          typography={typography}
          primaryLabel="SAVE CHANGES"
          onPrimaryPress={() =>
            onSavePress?.({
              shortDescription,
              customerName,
              serviceAddress,
              revenue,
            })
          }
          onDeletePress={onDeletePress}
        />
      </View>
      </KeyboardAvoidingView>
    </BottomSheetShell>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: space('Spacing/12'),
    width: '100%',
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space('Spacing/4'),
    alignSelf: 'flex-start',
  },
  fields: {
    gap: space('Spacing/8'),
    marginTop: space('Spacing/4'),
    marginBottom: space('Spacing/8'),
  },
  inputShell: {
    minHeight: 38,
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  inputText: {
    color: fg.primary,
    padding: 0,
    width: '100%',
  },
  revenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  revenueInput: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
