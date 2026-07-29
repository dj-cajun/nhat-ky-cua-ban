import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type ViewStyle,
} from 'react-native';

export type DeskWeather = 'night' | 'clear' | 'cloudy' | 'rain';

export type DeskSceneProps = {
  weather?: DeskWeather;
  lampOn?: boolean;
  /** Up to 3 photo URIs for cork slots; null = empty polaroid. */
  corkSlots?: Array<string | null>;
  /** Optional overlay text on memo (tenCharText). */
  memoText?: string;
  tomatoRunning?: boolean;
  onPressMemo?: () => void;
  onPressCork?: () => void;
  onPressFrame?: () => void;
  onPressTomato?: () => void;
  onPressWindow?: () => void;
  onPressLamp?: () => void;
};

/* Metro asset requires — same pattern as intro-asset.generated.ts */
/* eslint-disable @typescript-eslint/no-require-imports */
const ASSETS = {
  deskBg: require('../../../assets/desk/desk_bg.png') as ImageSourcePropType,
  plant: require('../../../assets/desk/plant.png') as ImageSourcePropType,
  books: require('../../../assets/desk/books.png') as ImageSourcePropType,
  tomato: require('../../../assets/desk/tomato_timer.png') as ImageSourcePropType,
  memo: require('../../../assets/desk/memo_note.png') as ImageSourcePropType,
  frame: require('../../../assets/desk/photo_frame.png') as ImageSourcePropType,
  lamp: require('../../../assets/desk/lamp.png') as ImageSourcePropType,
  lampGlow: require('../../../assets/desk/lamp_glow.png') as ImageSourcePropType,
  corkEmpty: require('../../../assets/desk/cork_empty.png') as ImageSourcePropType,
  sky: {
    night: require('../../../assets/desk/sky_night.png') as ImageSourcePropType,
    clear: require('../../../assets/desk/sky_clear.png') as ImageSourcePropType,
    cloudy: require('../../../assets/desk/sky_cloudy.png') as ImageSourcePropType,
    rain: require('../../../assets/desk/sky_rain.png') as ImageSourcePropType,
  },
} as const;
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * Coordinates measured against desk_bg.png (768×512).
 * desk_bg already draws the wall, dual frames, and desk surface —
 * do NOT stack a second corkboard/window_frame on top (that was the muddy collage).
 */
const LAYOUT = {
  /** Left frame inner glass */
  window: { x: 0.1, y: 0.13, w: 0.32, h: 0.36 },
  /** Right cork inner board */
  cork: { x: 0.56, y: 0.12, w: 0.33, h: 0.36 },
  corkSlots: [
    { x: 0.58, y: 0.15, w: 0.12, h: 0.14 },
    { x: 0.74, y: 0.15, w: 0.12, h: 0.14 },
    { x: 0.66, y: 0.31, w: 0.12, h: 0.14 },
  ],
  plant: { x: 0.04, y: 0.52, w: 0.16, h: 0.4 },
  books: { x: 0.2, y: 0.6, w: 0.18, h: 0.28 },
  tomato: { x: 0.4, y: 0.56, w: 0.15, h: 0.3 },
  memo: { x: 0.56, y: 0.56, w: 0.14, h: 0.32 },
  frame: { x: 0.7, y: 0.58, w: 0.13, h: 0.3 },
  lamp: { x: 0.84, y: 0.46, w: 0.14, h: 0.44 },
  lampGlow: { x: 0.72, y: 0.42, w: 0.26, h: 0.38 },
} as const;

const WEATHER_CYCLE: DeskWeather[] = ['night', 'clear', 'cloudy', 'rain'];

type BoxStyle = Pick<ViewStyle, 'left' | 'top' | 'width' | 'height'>;

function box(r: { x: number; y: number; w: number; h: number }): BoxStyle {
  const pct = (n: number) => `${(n * 100).toFixed(2)}%` as `${number}%`;
  return {
    left: pct(r.x),
    top: pct(r.y),
    width: pct(r.w),
    height: pct(r.h),
  };
}

/**
 * Layered desk for MY hompy only.
 * Base plate = desk_bg; sky/photos/props are insets — no duplicate frames.
 */
export function DeskScene({
  weather: weatherProp,
  lampOn: lampOnProp,
  corkSlots = [null, null, null],
  memoText,
  tomatoRunning = false,
  onPressMemo,
  onPressCork,
  onPressFrame,
  onPressTomato,
  onPressWindow,
  onPressLamp,
}: DeskSceneProps) {
  const [weather, setWeather] = useState<DeskWeather>(weatherProp ?? 'night');
  const [lampOn, setLampOn] = useState(lampOnProp ?? true);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (weatherProp) setWeather(weatherProp);
  }, [weatherProp]);

  useEffect(() => {
    if (lampOnProp !== undefined) setLampOn(lampOnProp);
  }, [lampOnProp]);

  useEffect(() => {
    if (!tomatoRunning) {
      shake.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shake, {
          toValue: 1,
          duration: 90,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          toValue: -1,
          duration: 90,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shake, {
          toValue: 0,
          duration: 90,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [tomatoRunning, shake]);

  const slots = [0, 1, 2].map((i) => corkSlots[i] ?? null);
  const tomatoRotate = shake.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-6deg', '6deg'],
  });

  const cycleWeather = () => {
    if (onPressWindow) {
      onPressWindow();
      return;
    }
    setWeather((w) => {
      const i = WEATHER_CYCLE.indexOf(w);
      return WEATHER_CYCLE[(i + 1) % WEATHER_CYCLE.length]!;
    });
  };

  const toggleLamp = () => {
    if (onPressLamp) {
      onPressLamp();
      return;
    }
    setLampOn((v) => !v);
  };

  return (
    <View style={styles.root} accessibilityLabel="Desk scene">
      {/* 1) Base plate — wall, frames, desk */}
      <Image source={ASSETS.deskBg} style={styles.fill} resizeMode="cover" />

      {/* 2) Sky painted into the left frame hole (desk_bg hole is opaque black) */}
      <View style={[styles.abs, box(LAYOUT.window), styles.windowClip]} pointerEvents="none">
        <Image source={ASSETS.sky[weather]} style={styles.fill} resizeMode="cover" />
      </View>

      {/* 3) Photos pinned into cork hole */}
      {LAYOUT.corkSlots.map((slot, i) => (
        <View key={`slot-${i}`} style={[styles.abs, box(slot), styles.slotClip]} pointerEvents="none">
          {slots[i] ? (
            <Image source={{ uri: slots[i]! }} style={styles.fill} resizeMode="cover" />
          ) : (
            <Image source={ASSETS.corkEmpty} style={styles.fill} resizeMode="cover" />
          )}
        </View>
      ))}
      <Pressable
        style={[styles.hit, box(LAYOUT.cork)]}
        onPress={onPressCork}
        accessibilityRole="button"
        accessibilityLabel="Open mini album"
      />
      <Pressable
        style={[styles.hit, box(LAYOUT.window)]}
        onPress={cycleWeather}
        accessibilityRole="button"
        accessibilityLabel="Change window weather"
      />

      {/* 4) Desk props */}
      <Image source={ASSETS.plant} style={[styles.abs, box(LAYOUT.plant)]} resizeMode="contain" />
      <Image source={ASSETS.books} style={[styles.abs, box(LAYOUT.books)]} resizeMode="contain" />

      <Animated.View
        style={[
          styles.abs,
          box(LAYOUT.tomato),
          { transform: [{ rotate: tomatoRotate }] },
        ]}
        pointerEvents="box-none"
      >
        <Image source={ASSETS.tomato} style={styles.fill} resizeMode="contain" />
        <Pressable
          style={styles.hitFill}
          onPress={onPressTomato}
          accessibilityRole="button"
          accessibilityLabel="Pomodoro tomato"
        />
      </Animated.View>

      <View style={[styles.abs, box(LAYOUT.memo)]} pointerEvents="box-none">
        <Image source={ASSETS.memo} style={styles.fill} resizeMode="contain" />
        {memoText ? (
          <Text style={styles.memoOverlay} numberOfLines={2}>
            {memoText}
          </Text>
        ) : null}
        <Pressable
          style={styles.hitFill}
          onPress={onPressMemo}
          accessibilityRole="button"
          accessibilityLabel="Today memo"
        />
      </View>

      <View style={[styles.abs, box(LAYOUT.frame)]} pointerEvents="box-none">
        {slots[0] ? (
          <Image
            source={{ uri: slots[0] }}
            style={[styles.fill, styles.framePhoto]}
            resizeMode="cover"
          />
        ) : null}
        <Image source={ASSETS.frame} style={styles.fill} resizeMode="contain" />
        <Pressable
          style={styles.hitFill}
          onPress={onPressFrame ?? onPressCork}
          accessibilityRole="button"
          accessibilityLabel="Photo frame album"
        />
      </View>

      {lampOn ? (
        <Image
          source={ASSETS.lampGlow}
          style={[styles.abs, box(LAYOUT.lampGlow), styles.glow]}
          resizeMode="contain"
        />
      ) : null}
      <View style={[styles.abs, box(LAYOUT.lamp)]} pointerEvents="box-none">
        <Image source={ASSETS.lamp} style={styles.fill} resizeMode="contain" />
        <Pressable
          style={styles.hitFill}
          onPress={toggleLamp}
          accessibilityRole="button"
          accessibilityLabel="Toggle desk lamp"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1512',
  },
  fill: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  abs: {
    position: 'absolute',
  },
  windowClip: {
    overflow: 'hidden',
    borderRadius: 4,
    zIndex: 0,
  },
  slotClip: {
    overflow: 'hidden',
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(40,28,18,0.55)',
    backgroundColor: '#2a1c12',
    zIndex: 2,
  },
  hit: {
    position: 'absolute',
    zIndex: 3,
  },
  hitFill: {
    ...StyleSheet.absoluteFill,
  },
  glow: {
    opacity: 0.75,
    zIndex: 4,
  },
  framePhoto: {
    margin: '12%',
    width: '76%',
    height: '76%',
    alignSelf: 'center',
  },
  memoOverlay: {
    position: 'absolute',
    left: '14%',
    right: '14%',
    top: '28%',
    fontSize: 10,
    lineHeight: 13,
    color: '#3a2e22',
    textAlign: 'center',
  },
});
