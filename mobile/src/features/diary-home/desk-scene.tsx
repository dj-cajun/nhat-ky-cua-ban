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
  corkSlots?: Array<string | null>;
  memoText?: string;
  tomatoRunning?: boolean;
  onPressMemo?: () => void;
  onPressCork?: () => void;
  onPressFrame?: () => void;
  onPressTomato?: () => void;
  onPressWindow?: () => void;
  onPressLamp?: () => void;
};

/* eslint-disable @typescript-eslint/no-require-imports */
const ASSETS = {
  deskBg: require('../../../assets/desk/desk_bg.png') as ImageSourcePropType,
  corkboard: require('../../../assets/desk/corkboard.png') as ImageSourcePropType,
  corkEmpty: require('../../../assets/desk/cork_empty.png') as ImageSourcePropType,
  books: require('../../../assets/desk/books.png') as ImageSourcePropType,
  tomato: require('../../../assets/desk/tomato_timer.png') as ImageSourcePropType,
  memo: require('../../../assets/desk/memo_note.png') as ImageSourcePropType,
  frame: require('../../../assets/desk/photo_frame.png') as ImageSourcePropType,
  lamp: require('../../../assets/desk/lamp.png') as ImageSourcePropType,
  lampGlow: require('../../../assets/desk/lamp_glow.png') as ImageSourcePropType,
  plant: require('../../../assets/desk/plant.png') as ImageSourcePropType,
  sky: {
    night: require('../../../assets/desk/sky_night.png') as ImageSourcePropType,
    clear: require('../../../assets/desk/sky_clear.png') as ImageSourcePropType,
    cloudy: require('../../../assets/desk/sky_cloudy.png') as ImageSourcePropType,
    rain: require('../../../assets/desk/sky_rain.png') as ImageSourcePropType,
  },
} as const;
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * Fitted to desk_bg.png (768×512): left window hole + right cork hole + desk band.
 * No second full-scene frames stacked on top of desk_bg.
 */
const LAYOUT = {
  window: { x: 0.1, y: 0.125, w: 0.325, h: 0.355 },
  cork: { x: 0.545, y: 0.11, w: 0.355, h: 0.37 },
  corkSlots: [
    { x: 0.57, y: 0.145, w: 0.13, h: 0.145 },
    { x: 0.735, y: 0.145, w: 0.13, h: 0.145 },
    { x: 0.65, y: 0.305, w: 0.13, h: 0.145 },
  ],
  plant: { x: 0.03, y: 0.54, w: 0.15, h: 0.38 },
  books: { x: 0.19, y: 0.62, w: 0.17, h: 0.26 },
  tomato: { x: 0.39, y: 0.57, w: 0.14, h: 0.28 },
  memo: { x: 0.55, y: 0.57, w: 0.13, h: 0.3 },
  frame: { x: 0.7, y: 0.6, w: 0.12, h: 0.28 },
  lamp: { x: 0.84, y: 0.48, w: 0.14, h: 0.42 },
  lampGlow: { x: 0.74, y: 0.44, w: 0.24, h: 0.36 },
} as const;

const WEATHER_CYCLE: DeskWeather[] = ['night', 'clear', 'cloudy', 'rain'];

type Box = { x: number; y: number; w: number; h: number };
type BoxStyle = Pick<ViewStyle, 'left' | 'top' | 'width' | 'height'>;

function box(r: Box): BoxStyle {
  const pct = (n: number) => `${(n * 100).toFixed(2)}%` as `${number}%`;
  return { left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h) };
}

/**
 * MY hompy desk — replaces Today I… + mini album.
 * Clean layer order: desk_bg → sky/corkboard insets → photos → props.
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
    setWeather((w) => WEATHER_CYCLE[(WEATHER_CYCLE.indexOf(w) + 1) % WEATHER_CYCLE.length]!);
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
      <Image source={ASSETS.deskBg} style={styles.fill} resizeMode="cover" />

      {/* Sky inside left window hole */}
      <View style={[styles.abs, box(LAYOUT.window), styles.clipRound]} pointerEvents="none">
        <Image source={ASSETS.sky[weather]} style={styles.fill} resizeMode="cover" />
      </View>

      {/* Cork texture fitted to right hole (not a second full wall frame) */}
      <View style={[styles.abs, box(LAYOUT.cork), styles.clipRound]} pointerEvents="none">
        <Image source={ASSETS.corkboard} style={styles.fill} resizeMode="cover" />
      </View>

      {/* Photo slots above cork */}
      {LAYOUT.corkSlots.map((slot, i) => (
        <View key={`slot-${i}`} style={[styles.abs, box(slot), styles.slot]} pointerEvents="none">
          {slots[i] ? (
            <Image source={{ uri: slots[i]! }} style={styles.fill} resizeMode="cover" />
          ) : (
            <View style={styles.emptySlot}>
              <Image source={ASSETS.corkEmpty} style={styles.emptyPolaroid} resizeMode="contain" />
            </View>
          )}
        </View>
      ))}

      <Pressable
        style={[styles.hit, box(LAYOUT.window)]}
        onPress={cycleWeather}
        accessibilityRole="button"
        accessibilityLabel="Change window weather"
      />
      <Pressable
        style={[styles.hit, box(LAYOUT.cork)]}
        onPress={onPressCork}
        accessibilityRole="button"
        accessibilityLabel="Open mini album"
      />

      <Image source={ASSETS.plant} style={[styles.abs, box(LAYOUT.plant)]} resizeMode="contain" />
      <Image source={ASSETS.books} style={[styles.abs, box(LAYOUT.books)]} resizeMode="contain" />

      <Animated.View
        style={[styles.abs, box(LAYOUT.tomato), { transform: [{ rotate: tomatoRotate }] }]}
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
        <View style={[styles.abs, box(LAYOUT.lampGlow), styles.glow]} pointerEvents="none">
          <Image source={ASSETS.lampGlow} style={styles.fill} resizeMode="contain" />
        </View>
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
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1512',
  },
  fill: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  abs: { position: 'absolute' },
  clipRound: {
    overflow: 'hidden',
    borderRadius: 6,
  },
  slot: {
    overflow: 'hidden',
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(30,20,12,0.65)',
    backgroundColor: '#3a2818',
    zIndex: 4,
  },
  emptySlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3e6d2',
  },
  emptyPolaroid: {
    width: '88%',
    height: '88%',
  },
  hit: { position: 'absolute', zIndex: 5 },
  hitFill: { ...StyleSheet.absoluteFill },
  glow: { opacity: 0.7, zIndex: 6 },
  framePhoto: {
    margin: '14%',
    width: '72%',
    height: '72%',
    alignSelf: 'center',
  },
  memoOverlay: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    top: '30%',
    fontSize: 10,
    lineHeight: 13,
    color: '#3a2e22',
    textAlign: 'center',
  },
});
