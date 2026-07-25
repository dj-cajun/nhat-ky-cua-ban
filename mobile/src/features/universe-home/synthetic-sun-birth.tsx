import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { INTRO_HANDOFF } from './handoff';
import { resolveHandoffLayout } from './handoff-layout';

/**
 * Plays when `universe-birth.mp4` is not bundled yet.
 * Ends on the same cover-matched handoff pose as the real video final frame.
 */
export function SyntheticSunBirth({
  width,
  height,
  onNearEnd,
  onEnded,
  short,
}: {
  width: number;
  height: number;
  onNearEnd: () => void;
  onEnded: () => void;
  short?: boolean;
}) {
  const scale = useSharedValue(short ? 0.85 : 0.08);
  const glow = useSharedValue(short ? 0.55 : 0.15);
  const opacity = useSharedValue(1);

  const layout = resolveHandoffLayout(width, height);
  const { diameter, left, top, cxPx, cyPx } = layout;

  useEffect(() => {
    const nearMs = short
      ? INTRO_HANDOFF.shortAppearSec * 1000 * 0.55
      : INTRO_HANDOFF.crossfadeStartSec * 1000;
    const endMs = short
      ? INTRO_HANDOFF.shortAppearSec * 1000
      : INTRO_HANDOFF.durationSec * 1000;

    const nearT = setTimeout(onNearEnd, nearMs);
    const endT = setTimeout(onEnded, endMs);

    if (short) {
      scale.value = withTiming(1, {
        duration: INTRO_HANDOFF.shortAppearSec * 1000,
        easing: Easing.out(Easing.cubic),
      });
      glow.value = withTiming(0.7, { duration: INTRO_HANDOFF.shortAppearSec * 1000 });
    } else {
      scale.value = withSequence(
        withTiming(1.15, {
          duration: 2200,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(1, {
          duration: 1000,
          easing: Easing.inOut(Easing.quad),
        }),
      );
      glow.value = withSequence(
        withTiming(1, { duration: 2200 }),
        withTiming(0.65, { duration: 1000 }),
      );
    }

    return () => {
      clearTimeout(nearT);
      clearTimeout(endT);
    };
  }, [short, onNearEnd, onEnded, scale, glow]);

  const sunStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + glow.value * 0.45,
    transform: [{ scale: 1.15 + glow.value * 0.35 }],
  }));

  return (
    <View style={[styles.root, { width, height, backgroundColor: INTRO_HANDOFF.spaceBg }]}>
      <Animated.View
        style={[
          styles.halo,
          {
            width: diameter * 1.55,
            height: diameter * 1.55,
            left: cxPx - (diameter * 1.55) / 2,
            top: cyPx - (diameter * 1.55) / 2,
            backgroundColor: INTRO_HANDOFF.sphere.glow,
          },
          haloStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.sun,
          {
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            left,
            top,
            backgroundColor: INTRO_HANDOFF.sphere.color,
            boxShadow: `0 0 28px ${INTRO_HANDOFF.sphere.glow}`,
          },
          sunStyle,
        ]}
      >
        <View
          style={[
            styles.core,
            {
              width: diameter * 0.45,
              height: diameter * 0.45,
              borderRadius: diameter * 0.225,
              backgroundColor: INTRO_HANDOFF.sphere.core,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  halo: {
    position: 'absolute',
    borderRadius: 9999,
  },
  sun: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
  },
  core: {
    opacity: 0.85,
  },
});
