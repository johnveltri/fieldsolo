/// <reference path="./expo-font.d.ts" />
/**
 * Expo / React Native — load fonts used by design-system/tokens/typography.json.
 *
 * In your Expo app:
 *   npx expo install expo-font @expo-google-fonts/ubuntu-sans-mono @expo-google-fonts/pt-serif
 *
 * Call `loadFieldSoloFonts()` once before rendering (e.g. root layout); await splash screen until resolved.
 * React Native `fontFamily` must use the Expo-registered names below, not the raw Google names.
 */
import * as Font from 'expo-font';
import {
  UbuntuSansMono_400Regular,
  UbuntuSansMono_600SemiBold,
  UbuntuSansMono_700Bold,
} from '@expo-google-fonts/ubuntu-sans-mono';
import { PTSerif_700Bold } from '@expo-google-fonts/pt-serif';

/** Registered keys for `fontFamily` after `loadFieldSoloFonts()` resolves. */
export const fieldsoloExpoFontFamily = {
  /** Typography/Body, Typography/Body-Small (Regular 400) */
  ubuntuSansMonoRegular: 'UbuntuSansMono_400Regular',
  /** Typography/Body-Bold, Metric-S (SemiBold 600) */
  ubuntuSansMonoSemiBold: 'UbuntuSansMono_600SemiBold',
  /** LABEL, Metric, Metric-XL (Bold 700) */
  ubuntuSansMonoBold: 'UbuntuSansMono_700Bold',
  /** Display-H1, Heading-H2, Title-H3 (Bold 700) */
  ptSerifBold: 'PTSerif_700Bold',
} as const;

export async function loadFieldSoloFonts(): Promise<void> {
  await Font.loadAsync({
    [fieldsoloExpoFontFamily.ubuntuSansMonoRegular]: UbuntuSansMono_400Regular,
    [fieldsoloExpoFontFamily.ubuntuSansMonoSemiBold]: UbuntuSansMono_600SemiBold,
    [fieldsoloExpoFontFamily.ubuntuSansMonoBold]: UbuntuSansMono_700Bold,
    [fieldsoloExpoFontFamily.ptSerifBold]: PTSerif_700Bold,
  });
}
