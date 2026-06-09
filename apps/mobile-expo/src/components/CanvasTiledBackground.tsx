import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';

import { colorWithAlpha } from '@fieldbook/design-system/lib/tokens';

import { bg } from '../theme/nativeTokens';

/**
 * Lined notebook paper over canvas — Figma Job Detail (`1836:1875`).
 *
 * We do **not** use `Image` + `resizeMode="repeat"` here: on iOS that path is unreliable
 * (tiling often fails or disappears with `absoluteFill` + low opacity). Instead we draw
 * the same 28px rhythm as Figma’s `background-size: 200px 28px` tile with hairline rows.
 *
 * Asset `assets/images/canvas-lined-tile.png` remains available if we later adopt
 * `expo-image` or a native tiled layer.
 */
const ROW_HEIGHT = 28;
const absoluteFill = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const;

type CanvasTiledBackgroundProps = {
  /**
   * Scroll offset for pages using scroll views.
   * Pass Animated scroll Y to make ruled lines move with content.
   */
  scrollY?: Animated.Value;
  /**
   * Total scrollable content height (typically reported via the scroll
   * view's `onContentSizeChange`). When provided, the lined layer is
   * sized to cover the entire scrollable area so the ruled lines never
   * "run out" at the bottom of long screens. Falls back to the viewport
   * height when omitted (legacy non-scrolling usage).
   */
  contentHeight?: number;
};

export function CanvasTiledBackground({
  scrollY,
  contentHeight,
}: CanvasTiledBackgroundProps = {}) {
  const { width, height: windowHeight } = useWindowDimensions();
  // Extend the tiled layer to whichever is taller: the viewport or the
  // scrollable content. Without this the layer translates up with
  // `scrollY` and exposes its bottom edge on long screens, leaving a
  // flat (and slightly off-color) band at the bottom.
  const layerHeight = Math.max(windowHeight, contentHeight ?? 0);
  const rows = Math.ceil(layerHeight / ROW_HEIGHT) + 2;
  /** Lined texture — 15% primary (was 20%; −0.05 opacity vs prior). */
  const lineColor = colorWithAlpha('Foundation/Text/Primary', 0.15);

  return (
    <Animated.View
      style={[
        styles.layer,
        { width, height: layerHeight },
        scrollY ? { transform: [{ translateY: Animated.multiply(scrollY, -1) }] } : null,
      ]}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: bg.canvasWarm }]} />
      {Array.from({ length: rows }, (_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            width,
            top: i * ROW_HEIGHT,
            height: ROW_HEIGHT,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: lineColor,
          }}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...absoluteFill,
    zIndex: 0,
    elevation: 0,
  },
});
