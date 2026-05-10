import { useFonts } from 'expo-font';
import { PTSerif_700Bold } from '@expo-google-fonts/pt-serif';
import {
  UbuntuSansMono_400Regular,
  UbuntuSansMono_600SemiBold,
  UbuntuSansMono_700Bold,
} from '@expo-google-fonts/ubuntu-sans-mono';
import { useMemo, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color } from '@fieldbook/design-system/lib/tokens';

import { CanvasTiledBackground } from '../components/CanvasTiledBackground';
import {
  TOP_HEADER_MAX_WIDTH,
  bg,
  createTextStyles,
  space,
} from '../theme/nativeTokens';

/** Placeholder shell — DS `Title Only` (`231:817`). */
export function EarningsScreen() {
  const insets = useSafeAreaInsets();
  const scrollY = useMemo(() => new Animated.Value(0), []);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);

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

  const headerTopPad = Math.max(insets.top - space('Spacing/12'), 0);
  const bottomNavReservedHeight =
    space('Spacing/8') + 1 + 64 + space('Spacing/8') + insets.bottom;

  if (!fontsLoaded) {
    return (
      <View style={styles.root}>
        <CanvasTiledBackground scrollY={scrollY} contentHeight={scrollContentHeight} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CanvasTiledBackground scrollY={scrollY} contentHeight={scrollContentHeight} />
      <View
        pointerEvents="none"
        style={[styles.safeAreaTopAccentWrap, { top: 0, maxWidth: TOP_HEADER_MAX_WIDTH }]}
      >
        <View style={styles.topAccent} />
      </View>
      <Animated.ScrollView
        style={[styles.scroll, { paddingTop: headerTopPad }]}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: bottomNavReservedHeight + space('Spacing/20'),
            flexGrow: 1,
          },
        ]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        onContentSizeChange={(_w, h) => setScrollContentHeight(h)}
      >
        <View style={styles.headerBand}>
          <View style={[styles.titleOnlyRow, { maxWidth: TOP_HEADER_MAX_WIDTH }]}>
            <Text style={typography.displayH1}>EARNINGS</Text>
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', backgroundColor: bg.canvasWarm },
  scroll: { flex: 1, width: '100%', backgroundColor: 'transparent' },
  scrollContent: {
    alignItems: 'stretch',
  },
  safeAreaTopAccentWrap: {
    position: 'absolute',
    width: '100%',
    alignSelf: 'center',
    zIndex: 5,
  },
  topAccent: {
    width: '100%',
    height: 6,
    backgroundColor: color('Brand/Accent'),
  },
  headerBand: {
    width: '100%',
    alignItems: 'center',
  },
  titleOnlyRow: {
    width: '100%',
    paddingHorizontal: space('Spacing/20'),
    paddingTop: space('Spacing/32'),
    paddingBottom: space('Spacing/16'),
    minHeight: 48,
    justifyContent: 'center',
  },
});
