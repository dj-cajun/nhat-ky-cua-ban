import { useEffect, type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { spaceMotion } from './space-motion';

/** Soft idle scale — use on self orb / ring after settle. */
export function BreathingView({
  active,
  children,
  style,
  amplitude = spaceMotion.breathScale,
}: {
  active: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  amplitude?: number;
}) {
  const breath = useSharedValue(1);

  useEffect(() => {
    if (active) {
      breath.value = withRepeat(
        withTiming(amplitude, {
          duration: spaceMotion.breathPeriodMs,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      );
    } else {
      cancelAnimation(breath);
      breath.value = 1;
    }
    return () => cancelAnimation(breath);
  }, [active, amplitude, breath]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
  }));

  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
