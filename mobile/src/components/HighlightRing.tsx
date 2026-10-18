import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';

import { radius, size, timing } from '@/theme';

/**
 * Opacity for a highlight that is fully on for newTicketHoldMs, then fades over
 * newTicketFadeMs and calls onDone. Shared by the ring and the kitchen "NEW" tag.
 */
export function useHighlightFade(onDone: () => void): Animated.Value {
  const [opacity] = useState(() => new Animated.Value(1));
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(timing.newTicketHoldMs),
      Animated.timing(opacity, {
        toValue: 0,
        duration: timing.newTicketFadeMs,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);
    anim.start(({ finished }) => {
      if (finished) done.current();
    });
    return () => anim.stop();
  }, [opacity]);
  return opacity;
}

/** "Look here" ring around something that just arrived. The parent leaves ringWidth of room. */
export function HighlightRing({ color, opacity }: { color: string; opacity: Animated.Value }) {
  return <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: color, opacity }]} />;
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    top: -size.ringWidth,
    left: -size.ringWidth,
    right: -size.ringWidth,
    bottom: -size.ringWidth,
    borderWidth: size.ringWidth,
    borderRadius: radius.lg + size.ringWidth,
  },
});
