import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions, Keyboard, KeyboardEvent, NativeScrollEvent, NativeSyntheticEvent,
  Platform, ScrollView, ScrollViewProps, TextInput,
} from 'react-native';

/**
 * A ScrollView that stays usable while the keyboard is up.
 *
 * `KeyboardAvoidingView` was doing nothing here. On iOS `behavior="padding"`
 * fights the safe area inside a tab/stack screen, and on Android the app passed
 * `behavior={undefined}` — a deliberate no-op that used to be fine, because
 * `softwareKeyboardLayoutMode: "resize"` shrank the window and the ScrollView
 * simply got shorter. Under the edge-to-edge window Expo now builds with, the
 * window is no longer resized: the keyboard is drawn over the app, the
 * ScrollView keeps its full height, and everything below the fold is sealed off
 * — you cannot scroll to it because, as far as the ScrollView is concerned,
 * there is nothing left to scroll.
 *
 * So measure the overlap instead of guessing at it. `endCoordinates.screenY` is
 * the top edge of the keyboard; anything of the window below that line is
 * covered. When the window *does* resize (older Androids, split screen) that
 * subtraction comes out at zero on its own and no padding is added, so this is
 * correct on both without a platform branch.
 *
 * The focused field is then scrolled clear of the keyboard, so typing in a
 * field near the bottom of a form doesn't start with the customer scrolling
 * blind.
 */
/**
 * How much of the window the keyboard is covering right now, in pixels.
 *
 * Zero whenever the keyboard is down — and also whenever the platform resizes
 * the window instead of drawing over it, since in that case the layout has
 * already made room and nothing needs adding. Screens that are not a plain
 * ScrollView (a chat with a pinned composer, for instance) use this directly.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      setInset(Math.max(0, Dimensions.get('window').height - (event.endCoordinates?.screenY ?? 0)));
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setInset(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);
  return inset;
}

export function KeyboardAwareScroll({
  children,
  contentContainerStyle,
  extraBottomSpace = 24,
  ...rest
}: ScrollViewProps & { children: React.ReactNode; extraBottomSpace?: number }) {
  const [inset, setInset] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const offsetRef = useRef(0);

  const revealFocusedField = useCallback((keyboardTop: number) => {
    const focused: any = (TextInput as any).State?.currentlyFocusedInput?.();
    if (!focused || typeof focused.measureInWindow !== 'function') return;
    focused.measureInWindow((_x: number, y: number, _w: number, height: number) => {
      if (typeof y !== 'number' || typeof height !== 'number') return;
      // A field is "clear" when its bottom edge plus a little breathing room
      // sits above the keyboard.
      const overshoot = y + height + 16 - keyboardTop;
      if (overshoot > 0) {
        scrollRef.current?.scrollTo({ y: Math.max(0, offsetRef.current + overshoot), animated: true });
      }
    });
  }, []);

  useEffect(() => {
    const onShow = (event: KeyboardEvent) => {
      const keyboardTop = event.endCoordinates?.screenY ?? 0;
      const overlap = Math.max(0, Dimensions.get('window').height - keyboardTop);
      setInset(overlap);
      // One frame, so the padding is applied before we scroll against it.
      requestAnimationFrame(() => revealFocusedField(keyboardTop));
    };
    const onHide = () => setInset(0);

    // iOS reports the frame before the keyboard animates in, which keeps the
    // scroll in step with it. Android only ever fires the "did" pair.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => { showSub.remove(); hideSub.remove(); };
  }, [revealFocusedField]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = event.nativeEvent.contentOffset.y;
    rest.onScroll?.(event);
  };

  return (
    <ScrollView
      {...rest}
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps={rest.keyboardShouldPersistTaps ?? 'handled'}
      keyboardDismissMode={rest.keyboardDismissMode ?? (Platform.OS === 'ios' ? 'interactive' : 'on-drag')}
      contentContainerStyle={[
        contentContainerStyle,
        inset > 0 && { paddingBottom: inset + extraBottomSpace },
      ]}
    >
      {children}
    </ScrollView>
  );
}
