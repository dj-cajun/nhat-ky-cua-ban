import { useEffect, type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { spaceMotion } from './space-motion';

/** One-shot fade/rise on mount — circle room & diary entry. */
export function EnterFade({
  children,
  delayMs = 0,
  style,
  translateY = 10,
}: {
  children: ReactNode;
  delayMs?: number;
  style?: StyleProp<ViewStyle>;
  translateY?: number;
}) {
  const op = useSharedValue(0);
  const y = useSharedValue(translateY);

  useEffect(() => {
    op.value = withDelay(
      delayMs,
      withTiming(1, {
        duration: spaceMotion.roomEnterMs,
        easing: Easing.out(Easing.cubic),
      }),
    );
    y.value = withDelay(
      delayMs,
      withTiming(0, {
        duration: spaceMotion.roomEnterMs,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [delayMs, op, y]);

  const anim = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateY: y.value }],
  }));

  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
