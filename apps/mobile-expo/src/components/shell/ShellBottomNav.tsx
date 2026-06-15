import { useFonts } from 'expo-font';
import { PTSerif_700Bold } from '@expo-google-fonts/pt-serif';
import {
  UbuntuSansMono_400Regular,
  UbuntuSansMono_600SemiBold,
  UbuntuSansMono_700Bold,
} from '@expo-google-fonts/ubuntu-sans-mono';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color as dsColor } from '@fieldsolo/design-system/lib/tokens';

import {
  BottomNavIconEarnings,
  BottomNavIconHome,
  BottomNavIconJobs,
} from '../bottom-nav/BottomNavTabIcons';
import {
  bg,
  border,
  createTextStyles,
  fg,
  radius,
  space,
} from '../../theme/nativeTokens';

export type ShellMainTab = 'home' | 'jobs' | 'earnings';

function shellBottomNavBottomPadding(insetsBottom: number): number {
  const stripPad = space('Spacing/8');
  const adjusted = insetsBottom + stripPad - space('Spacing/32');
  const floor = Platform.OS === 'android' ? space('Spacing/12') : 0;
  return Math.max(floor, adjusted);
}

/** Matches `ShellBottomNav` outer height (main content bottom → screen bottom). */
export function shellBottomNavOuterHeight(insetsBottom: number): number {
  return 1 + space('Spacing/64') + shellBottomNavBottomPadding(insetsBottom);
}

type Typography = ReturnType<typeof createTextStyles>;

function BottomNavTabCell({
  selected,
  label,
  icon,
  typography,
  onPress,
}: {
  selected: boolean;
  label: string;
  icon: ReactNode;
  typography: Typography;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} tab`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bottomNavTabCell,
        { justifyContent: selected ? 'space-between' : 'flex-end' },
        pressed && styles.pressed,
      ]}
    >
      {selected ? (
        <View style={styles.bottomNavIndicatorWrap}>
          <View style={styles.bottomNavIndicator} />
        </View>
      ) : null}
      <View style={styles.bottomNavTabContent}>
        <View style={styles.bottomNavIconSlot}>{icon}</View>
        <Text
          style={[
            typography.labelCaps,
            { color: selected ? dsColor('Brand/Primary') : fg.primary, textAlign: 'center' },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export type ShellBottomNavProps = {
  selected: ShellMainTab;
  onSelect: (tab: ShellMainTab) => void;
};

export function ShellBottomNav({ selected, onSelect }: ShellBottomNavProps) {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    PTSerif_700Bold,
    UbuntuSansMono_400Regular,
    UbuntuSansMono_600SemiBold,
    UbuntuSansMono_700Bold,
  });

  const typography = useMemo(
    () =>
      createTextStyles({
        serifBold: 'PTSerif_700Bold',
        mono: 'UbuntuSansMono_400Regular',
        monoSemi: 'UbuntuSansMono_600SemiBold',
        monoBold: 'UbuntuSansMono_700Bold',
      }),
    [],
  );

  if (!fontsLoaded) {
    return null;
  }

  const stripPad = space('Spacing/8');
  const bottomPadding = shellBottomNavBottomPadding(insets.bottom);
  const homeStroke = selected === 'home' ? dsColor('Brand/Primary') : fg.primary;
  const jobsStroke = selected === 'jobs' ? dsColor('Brand/Primary') : fg.primary;
  const earningsStroke = selected === 'earnings' ? dsColor('Brand/Primary') : fg.primary;

  return (
    <View
      style={[
        styles.bottomNav,
        {
          paddingHorizontal: stripPad,
          paddingBottom: bottomPadding,
        },
      ]}
    >
      <View style={styles.bottomNavInner}>
        <BottomNavTabCell
          selected={selected === 'home'}
          label="HOME"
          typography={typography}
          onPress={() => onSelect('home')}
          icon={<BottomNavIconHome color={homeStroke} />}
        />
        <BottomNavTabCell
          selected={selected === 'jobs'}
          label="JOBS"
          typography={typography}
          onPress={() => onSelect('jobs')}
          icon={<BottomNavIconJobs color={jobsStroke} />}
        />
        <BottomNavTabCell
          selected={selected === 'earnings'}
          label="EARNINGS"
          typography={typography}
          onPress={() => onSelect('earnings')}
          icon={<BottomNavIconEarnings color={earningsStroke} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    width: '100%',
    flexShrink: 0,
    borderTopWidth: 1,
    borderTopColor: border.subtle,
    backgroundColor: bg.canvasWarm,
  },
  bottomNavInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: space('Spacing/64'),
    width: '100%',
  },
  bottomNavTabCell: {
    flex: 1,
    minWidth: 0,
    minHeight: space('Spacing/64'),
  },
  bottomNavIndicatorWrap: {
    alignItems: 'center',
    paddingTop: space('Spacing/2'),
  },
  bottomNavIndicator: {
    borderRadius: radius('Radius/Full'),
    backgroundColor: dsColor('Brand/Primary'),
    width: space('Spacing/32'),
    height: space('Spacing/4'),
  },
  bottomNavTabContent: {
    alignItems: 'center',
    gap: space('Spacing/2'),
    padding: space('Spacing/12'),
  },
  bottomNavIconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: space('Spacing/28'),
  },
  pressed: { opacity: 0.75 },
});
