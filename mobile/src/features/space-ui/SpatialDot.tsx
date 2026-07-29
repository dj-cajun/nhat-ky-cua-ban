import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { spaceMotion } from './space-motion';

type Props = {
  homeX: number;
  homeY: number;
  focusX: number;
  focusY: number;
  homeSize: number;
  focusSize: number;
  color: string;
  focusColor: string;
  focused: boolean;
  dimmed: boolean;
  zIndex: number;
  enabled: boolean;
  accessibilityLabel: string;
  onPress: () => void;
};

/** Distant/near node — animates closer and larger when focused. */
export function SpatialDot({
  homeX,
  homeY,
  focusX,
  focusY,
  homeSize,
  focusSize,
  color,
  focusColor,
  focused,
  dimmed,
  zIndex,
  enabled,
  accessibilityLabel,
  onPress,
}: Props) {
  const t = useSharedValue(0);
  const opacity = useSharedValue(dimmed ? 0.35 : 0.85);

  useEffect(() => {
    t.value = withTiming(focused ? 1 : 0, {
      duration: spaceMotion.focusPullMs,
      easing: Easing.out(Easing.cubic),
    });
    opacity.value = withTiming(dimmed ? 0.35 : focused ? 1 : 0.85, {
      duration: spaceMotion.focusPullMs,
    });
  }, [focused, dimmed, t, opacity]);

  const style = useAnimatedStyle(() => {
    const p = t.value;
    const x = homeX + (focusX - homeX) * p;
    const y = homeY + (focusY - homeY) * p;
    const s = homeSize + (focusSize - homeSize) * p;
    return {
      left: x - s / 2,
      top: y - s / 2,
      width: s,
      height: s,
      borderRadius: s,
      backgroundColor: p > 0.5 ? focusColor : color,
      opacity: opacity.value,
      zIndex,
    };
  });

  return (
    <Animated.View style={[styles.dot, style]} pointerEvents={enabled ? 'auto' : 'none'}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
  },
});
