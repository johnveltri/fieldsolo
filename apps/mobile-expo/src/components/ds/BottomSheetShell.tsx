import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type LayoutChangeEvent,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, radius, space } from '@fieldbook/design-system/lib/tokens';

import { useBottomSheetStackWriters } from '../../context/BottomSheetStackContext';
import { bg, border } from '../../theme/nativeTokens';

const absoluteFill = {
  position: 'absolute',
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const;

type BottomSheetShellVariant =
  | 'standard'
  | /**
     * No outer cream shell, drag handle, or top corner radius. Children own
     * the entire visual frame (header, body, padding). Used by the Live
     * Session sheet which paints its own dark `live-session-header` slab.
     */
    'fullbleedDark';

type BottomSheetShellProps = {
  children: ReactNode;
  visible: boolean;
  extraBottomOffset?: number;
  onClose?: () => void;
  onClosed?: () => void;
  /**
   * Visual variant of the outer shell. Defaults to `'standard'` (cream
   * rounded surface + drag handle).
   */
  variant?: BottomSheetShellVariant;
  /**
   * Cap the sheet height at `fraction * window.height` and make the inner
   * content area vertically scrollable past that. The default is unset
   * (sheet grows with its children — same as before this prop existed).
   *
   * Used by the Live Session sheet which can extend essentially to the top
   * of the screen if its content requires it, and only scrolls once it
   * has reached its max height.
   */
  autoSizeUpToFraction?: number;
  /**
   * Whether this sheet should self-register with the global
   * `BottomSheetStackContext` so the floating live-session bar can lift
   * itself above this sheet (and dismiss it when the user expands the
   * live session). Defaults to `true` for app-level sheets. The Live
   * Session sheets themselves opt out (`false`) — otherwise the bar would
   * try to position itself relative to its own sheet.
   */
  registerInGlobalStack?: boolean;
};

/**
 * Reusable app-level bottom-sheet frame for edit/action flows.
 *
 * Includes scrim, top rounded shell (variant `standard`), drag handle, and
 * safe-area bottom padding. The Live Session sheet uses `variant='fullbleedDark'`
 * to draw its own dark header slab, and `autoSizeUpToFraction` to grow with
 * content while capping at the screen.
 */
export function BottomSheetShell({
  children,
  visible,
  extraBottomOffset = 0,
  onClose,
  onClosed,
  variant = 'standard',
  autoSizeUpToFraction,
  registerInGlobalStack = true,
}: BottomSheetShellProps) {
  const insets = useSafeAreaInsets();
  const sheetStack = useBottomSheetStackWriters();
  const sheetId = useId();
  // Keep `onClose` in a ref so re-registering the sheet (when the prop
  // identity changes between renders) doesn't churn the global stack.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  // Use the window height as the hidden translate-Y. A hard-coded value
  // (previously 420) is unsafe because some sheets (e.g. DropdownBottomSheet
  // with 7+ preset rows + custom input) are taller than that — the hidden
  // sheet would still poke up above the bottom edge and visually cover the
  // footer / safe-area primary button of any sheet rendered below it in the
  // sibling stack.
  const windowHeight = Dimensions.get('window').height;
  const hiddenOffset = windowHeight;
  const translateY = useRef(new Animated.Value(hiddenOffset)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const forcedOffset = useRef(new Animated.Value(0)).current;

  /**
   * Tracks whether the sheet's natural content height exceeds the cap, so we
   * can switch the inner content area between "auto-size" and "scrollable
   * fixed-height" without freezing the sheet at full height when content is
   * short.
   */
  const [contentOverflow, setContentOverflow] = useState(false);

  /**
   * Tracks keyboard visibility so we can drop the safe-area bottom from
   * `paddingBottom` when the keyboard is up — the keyboard already covers
   * that region, otherwise the sheet ends up with ~SB extra cream below
   * the primary CTA when typing.
   */
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  /**
   * Keep the overlay in the elevated stacking band while a sheet is open or
   * playing its close animation. Drop back to flat once fully hidden so
   * invisible full-screen overlays do not occlude the shell FAB / minimized
   * live-session bar on Android (elevation-based compositing).
   */
  const [stackingElevated, setStackingElevated] = useState(visible);

  useEffect(() => {
    if (visible) {
      setStackingElevated(true);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 0.3,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: hiddenOffset,
        duration: 210,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scrimOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setStackingElevated(false);
        onClosed?.();
      }
    });
  }, [hiddenOffset, onClosed, scrimOpacity, translateY, visible]);

  useEffect(() => {
    Animated.timing(forcedOffset, {
      toValue: Math.max(0, extraBottomOffset),
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [extraBottomOffset, forcedOffset]);

  // ---- Global stack registration -------------------------------------------
  // Sheets register themselves with the app-wide `BottomSheetStackContext`
  // while visible so the LiveSessionOverlay can lift its floating bar
  // above whatever sheet is currently presented (and politely dismiss it
  // when the user expands the live session). Live-session sheets opt out
  // via `registerInGlobalStack={false}`.
  useEffect(() => {
    if (!sheetStack || !registerInGlobalStack || !visible) return;
    const unregister = sheetStack.registerSheet(sheetId, {
      onRequestClose: () => onCloseRef.current?.(),
    });
    return unregister;
  }, [registerInGlobalStack, sheetId, sheetStack, visible]);

  // Reports the rendered sheet's top edge (window-relative) every time the
  // inner Animated.View lays out, so the live-session bar can sit just
  // above it. We compute this from the sheet's measured height + the known
  // window height since the sheet is anchored to the bottom of the window.
  const handleSheetLayout = useCallback(
    (e: LayoutChangeEvent) => {
      if (!sheetStack || !registerInGlobalStack || !visible) return;
      const measuredHeight = e.nativeEvent.layout.height;
      const measuredWindowHeight = Dimensions.get('window').height;
      const topY = Math.max(0, measuredWindowHeight - measuredHeight);
      sheetStack.setSheetTop(sheetId, topY);
    },
    [registerInGlobalStack, sheetId, sheetStack, visible],
  );

  // We let `KeyboardAvoidingView` (below) actually push the sheet up; this
  // listener only tracks the keyboard-visible flag so we can drop the
  // safe-area bottom from the sheet's own `paddingBottom` while it's open
  // (the keyboard already covers that region).
  useEffect(() => {
    const onShow = () => setKeyboardVisible(true);
    const onHide = () => setKeyboardVisible(false);
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const isFullbleed = variant === 'fullbleedDark';

  // Cap the OUTER sheet view at this height when the caller opts in. We
  // reserve the keyboard offset / extra offset slots same as the existing
  // translate logic — the sheet's max useful height shrinks when the keyboard
  // is up so primary actions stay reachable. Bottom inset is part of the
  // sheet's internal padding (see `paddingBottom` below) and is included in
  // the cap.
  const maxSheetHeight = autoSizeUpToFraction
    ? Math.max(160, windowHeight * autoSizeUpToFraction)
    : undefined;

  // When the keyboard is up the keyboard itself covers the home indicator
  // / safe-area bottom region, so we collapse our own safe-area
  // paddingBottom to keep the primary CTA flush ~12px above the keyboard
  // top instead of leaving an SB-sized gap of cream below it.
  const effectiveSafeBottom = keyboardVisible ? 0 : insets.bottom;

  // The inner scrollview becomes height-locked when content overflows. We
  // approximate the available content height by subtracting the chrome we
  // own (handle area, safe-area bottom). Children own their padding when
  // `fullbleedDark`, so the only overhead there is the safe-area bottom.
  const sheetChromeHeight = isFullbleed
    ? effectiveSafeBottom + space('Spacing/12')
    : space('Spacing/16') /* paddingTop */ +
      6 /* handle h */ +
      space('Spacing/16') /* handle marginBottom */ +
      effectiveSafeBottom +
      space('Spacing/12');

  const scrollViewMaxHeight =
    maxSheetHeight != null ? Math.max(0, maxSheetHeight - sheetChromeHeight) : undefined;

  // When the sheet is hidden we still keep the view tree mounted so the slide-down
  // animation can play, but taps must pass through to whatever is behind us —
  // otherwise stacking two sheets (e.g. chooser + edit) swallows the active sheet's
  // taps via the inactive sheet's scrim Pressable.
  return (
    <View
      style={[
        styles.overlay,
        stackingElevated ? styles.overlayElevated : styles.overlayFlat,
      ]}
      pointerEvents={visible ? 'box-none' : 'none'}
    >
      {/* Scrim sits in its OWN absolutely-positioned layer so it covers
          the full screen (including the area behind the keyboard) — keeps
          tap-to-dismiss working everywhere outside the sheet. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close bottom sheet"
        onPress={onClose}
        style={absoluteFill}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]} />
      </Pressable>
      {/* `KeyboardAvoidingView` adds bottom padding equal to the keyboard
          height when it appears. Combined with `justifyContent: 'flex-end'`
          this pushes the sheet UP so its bottom edge stays flush with the
          keyboard top regardless of how iOS reports keyboard frames on
          this device. We use `behavior="padding"` on iOS (smooth animation
          alongside our open/close transform) and `'height'` on Android
          which works better with the soft input mode. */}
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
      >
        <Animated.View
          onLayout={handleSheetLayout}
          style={[
            isFullbleed ? styles.sheetFullbleed : styles.sheet,
            {
              paddingBottom: isFullbleed ? 0 : effectiveSafeBottom + space('Spacing/12'),
              maxHeight: maxSheetHeight,
              transform: [
                {
                  translateY: Animated.add(
                    translateY,
                    Animated.multiply(forcedOffset, -1),
                  ),
                },
              ],
            },
          ]}
          pointerEvents={visible ? 'auto' : 'none'}
        >
          {!isFullbleed ? <View style={styles.handle} /> : null}
          {scrollViewMaxHeight != null ? (
            <ScrollView
              style={{ maxHeight: scrollViewMaxHeight }}
              contentContainerStyle={isFullbleed ? undefined : styles.contentContainer}
              scrollEnabled={contentOverflow}
              showsVerticalScrollIndicator={contentOverflow}
              onContentSizeChange={(_w, h) => {
                setContentOverflow(h > scrollViewMaxHeight);
              }}
              keyboardShouldPersistTaps="handled"
            >
              {isFullbleed ? children : <View style={styles.content}>{children}</View>}
            </ScrollView>
          ) : isFullbleed ? (
            children
          ) : (
            <View style={styles.content}>{children}</View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...absoluteFill,
    justifyContent: 'flex-end',
  },
  overlayElevated: {
    zIndex: 1000,
    elevation: 1000,
  },
  overlayFlat: {
    zIndex: 0,
    elevation: 0,
  },
  /**
   * `KeyboardAvoidingView` host. Fills the overlay (so its `flex-end`
   * justification anchors the sheet to the bottom of whatever space is left
   * after the keyboard takes its share). The KAV adds `paddingBottom` on
   * iOS / shrinks `height` on Android when the keyboard appears.
   */
  kav: {
    ...absoluteFill,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...absoluteFill,
    backgroundColor: color('Foundation/Text/Primary'),
    opacity: 0.3,
  },
  sheet: {
    borderTopLeftRadius: radius('Radius/32'),
    borderTopRightRadius: radius('Radius/32'),
    borderTopWidth: 1,
    borderTopColor: border.subtle,
    backgroundColor: bg.canvasWarm,
    paddingTop: space('Spacing/16'),
    paddingHorizontal: space('Spacing/24'),
  },
  /**
   * Fullbleed variant: caller owns ALL visual chrome (top corners, header
   * background, padding) so the dark live-session header can run flush to
   * the rounded top edge.
   */
  sheetFullbleed: {
    borderTopLeftRadius: radius('Radius/32'),
    borderTopRightRadius: radius('Radius/32'),
    overflow: 'hidden',
    backgroundColor: bg.canvasWarm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 6,
    borderRadius: radius('Radius/Full'),
    backgroundColor: color('Foundation/Text/Primary'),
    opacity: 0.2,
    marginBottom: space('Spacing/16'),
  },
  content: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 343,
  },
  contentContainer: {
    alignItems: 'center',
  },
});
