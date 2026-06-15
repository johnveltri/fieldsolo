import type { TextStyle, ViewStyle } from 'react-native';
import {
  color,
  radius,
  space,
  typographyJson,
  type TypographyTokenName,
} from '@fieldsolo/design-system/lib/tokens';

/** Matches design-system `TopHeader` max width (`231:817`). */
export const TOP_HEADER_MAX_WIDTH = 393;

/** Matches `JobSummaryCard` / list cards (`353` max in DS). */
export const CONTENT_MAX_WIDTH = 353;

export const bg = {
  canvas: color('Foundation/Background/Default'),
  canvasWarm: color('Foundation/Background/CanvasWarm'),
  surface: color('Foundation/Surface/Default'),
  surfaceWhite: color('Foundation/Surface/White'),
  subtle: color('Foundation/Surface/Subtle'),
} as const;

export const fg = {
  primary: color('Foundation/Text/Primary'),
  secondary: color('Foundation/Text/Secondary'),
  muted: color('Foundation/Text/Muted'),
} as const;

export const border = {
  subtle: color('Foundation/Border/Subtle'),
  default: color('Foundation/Border/Default'),
} as const;

/** Maps `Shadow/Card/Default` — RN elevation; color from `Foundation/Shadow/Ambient`. */
export const cardShadowRn: ViewStyle = {
  shadowColor: color('Foundation/Shadow/Ambient'),
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 2,
};

export const shadowNoneRn: ViewStyle = {
  shadowOpacity: 0,
  elevation: 0,
};

export function padScreenHorizontal(): number {
  return space('Spacing/20');
}

export { color, radius, space };

export type LoadedFonts = {
  serifBold: string;
  mono: string;
  monoSemi: string;
  monoBold: string;
};

type TypographyDef = (typeof typographyJson)[TypographyTokenName];

function monoFamilyForToken(t: TypographyDef, f: LoadedFonts): string {
  if (t.weight >= 700) return f.monoBold;
  if (t.weight >= 600) return f.monoSemi;
  return f.mono;
}

function fontFamilyForToken(t: TypographyDef, f: LoadedFonts): string {
  return t.family === 'PT Serif' ? f.serifBold : monoFamilyForToken(t, f);
}

/** Line height in px: token `100` = auto → ~1.25× font size; else percent of font size. */
function lineHeightPx(t: TypographyDef): number {
  if (t.lineHeight === 100) {
    return Math.round(t.size * 1.25);
  }
  return Math.round((t.size * t.lineHeight) / 100);
}

/** Letter-spacing in px (approximates CSS `letterSpacing/100 em`). */
function letterSpacingPx(t: TypographyDef): number {
  if (t.letterSpacing === 0) return 0;
  return Math.round((t.letterSpacing / 100) * t.size * 10) / 10;
}

/**
 * Builds React Native `TextStyle` from design-system `typography.json` + loaded Expo font names.
 */
export function typographyRn(
  token: TypographyTokenName,
  f: LoadedFonts,
  colorOverride?: string,
): TextStyle {
  const t = typographyJson[token];
  const textTransform =
    'textTransform' in t && t.textTransform === 'uppercase' ? 'uppercase' : 'none';

  return {
    fontFamily: fontFamilyForToken(t, f),
    fontSize: t.size,
    lineHeight: lineHeightPx(t),
    letterSpacing: letterSpacingPx(t),
    textTransform,
    color: colorOverride ?? fg.primary,
  };
}

export type TextStyles = ReturnType<typeof createTextStyles>;

/** Typography mapped to loaded Expo Google Font family names — all sizes/weights from `typography.json`. */
export function createTextStyles(f: LoadedFonts) {
  const t = (name: TypographyTokenName, colorOverride?: string): TextStyle =>
    typographyRn(name, f, colorOverride);

  return {
    displayH1: t('Typography/Display-H1'),
    titleH3: t('Typography/Title-H3'),
    headingH2: t('Typography/JobDetail/Title'),
    body: t('Typography/Body'),
    bodySecondary: { ...t('Typography/Body'), color: fg.secondary },
    bodyBold: t('Typography/Body-Bold'),
    bodySmall: t('Typography/Body-Small'),
    labelCaps: t('Typography/LABEL', fg.muted),
    labelHeadingSecondary: t('Typography/LABEL', fg.secondary),
    metric: t('Typography/Metric'),
    metricXL: t('Typography/Metric-XL'),
    metricS: t('Typography/Section/MetricS-Dense', color('Brand/Accent')),
    sessionTimeRange: t('Typography/Session/TimeRange', fg.secondary),
    jobDetailSubtitle: t('Typography/JobDetail/Subtitle', fg.secondary),
    jobDetailCategoryLabel: t('Typography/JobDetail/CategoryLabel', bg.canvasWarm),
    jobDetailMetricColumnLabel: t('Typography/JobDetail/MetricColumnLabel', fg.secondary),
    jobDetailNetAmount: t('Typography/JobDetail/NetAmount'),
    ctaPrimaryLabel: t('Typography/CTA/PrimaryLabel'),
    pillCompact: t('Typography/Pill/Compact'),
    /** `Typography/LABEL` — status pills; pair with `color` from semantic status tokens (all-caps in UI). */
    statusPillLabel: t('Typography/LABEL'),
  };
}
