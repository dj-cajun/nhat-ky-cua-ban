import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useMemo } from 'react';
import { Pressable, Text, useWindowDimensions } from 'react-native';
import type { CircleSummary, Profile } from '@/types/domain';
import { INTRO_HANDOFF } from './handoff';
import { resolveHandoffLayout, resolveSettleScale } from './handoff-layout';

/**
 * Web / GL-fail universe: crossfade at intro size, then shrink to home size.
 */
export function FallbackUniverse({
  profile,
  circles,
  revealProfile,
  revealPlanets,
  onPressSelf,
  onPressCircle,
  animateSettle = true,
}: {
  profile: Profile;
  circles: CircleSummary[];
  revealProfile: boolean;
  revealPlanets: boolean;
  onPressSelf: () => void;
  onPressCircle: (id: string) => void;
  /** When false (tab return / skip intro), land already settled. */
  animateSettle?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const layout = resolveHandoffLayout(width, height);
  const { diameter, left, top, cxPx, cyPx } = layout;
  const settleScale = resolveSettleScale(width, height);

  const floatY = useSharedValue(0);
  const profileOp = useSharedValue(0);
  const planetOp = useSharedValue(0);
  // 1 = intro size, settleScale = home size
  const sizeScale = useSharedValue(revealProfile && !animateSettle ? settleScale : 1);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(6, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [floatY]);

  useEffect(() => {
    if (revealProfile) {
      sizeScale.value = animateSettle
        ? withTiming(settleScale, {
            duration: INTRO_HANDOFF.settleDurationSec * 1000,
            easing: Easing.out(Easing.cubic),
          })
        : settleScale;
    } else {
      sizeScale.value = 1;
    }
  }, [revealProfile, animateSettle, settleScale, sizeScale]);

  useEffect(() => {
    profileOp.value = withTiming(revealProfile ? 1 : 0, {
      duration: INTRO_HANDOFF.profileFadeSec * 1000,
    });
  }, [revealProfile, profileOp]);

  useEffect(() => {
    planetOp.value = withDelay(
      revealPlanets ? 120 : 0,
      withTiming(revealPlanets ? 1 : 0, {
        duration: INTRO_HANDOFF.planetsStaggerSec * 1000,
      }),
    );
  }, [revealPlanets, planetOp]);

  const sphereStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { scale: sizeScale.value }],
  }));

  const profileStyle = useAnimatedStyle(() => ({
    opacity: profileOp.value,
  }));

  const planetsStyle = useAnimatedStyle(() => ({
    opacity: planetOp.value,
  }));

  const planets = useMemo(() => {
    const n = Math.max(circles.length, 1);
    // Orbit relative to settled home size so planets sit around the final orb.
    const homeR = (INTRO_HANDOFF.sphere.homeDiameterRatio * width) / 2;
    return circles.map((c, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const radius = homeR * (2.4 + (i % 3) * 0.35);
      return {
        ...c,
        x: cxPx + Math.cos(angle) * radius - 36,
        y: cyPx + Math.sin(angle) * radius - 36,
      };
    });
  }, [circles, width, cxPx, cyPx]);

  const hit = diameter * 1.35;

  return (
    <View style={[styles.root, { width, height, backgroundColor: INTRO_HANDOFF.spaceBg }]}>
      <StarField width={width} height={height} />

      <Animated.View
        style={[
          styles.sphereWrap,
          {
            left: left - diameter * 0.175,
            top: top - diameter * 0.175,
            width: hit,
            height: hit,
          },
          sphereStyle,
        ]}
      >
        <Pressable
          onPress={onPressSelf}
          style={styles.sphereHit}
          accessibilityRole="button"
          accessibilityLabel={profile.displayName}
          testID="universe-self-sphere"
        >
          <View
            pointerEvents="none"
            style={[
              styles.glow,
              {
                width: hit,
                height: hit,
                borderRadius: hit / 2,
                backgroundColor: INTRO_HANDOFF.sphere.glow,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.sphere,
              {
                width: diameter,
                height: diameter,
                borderRadius: diameter / 2,
                backgroundColor: INTRO_HANDOFF.sphere.color,
              },
            ]}
          >
            <View
              style={[
                styles.highlight,
                {
                  width: diameter * 0.35,
                  height: diameter * 0.18,
                  borderRadius: diameter * 0.1,
                },
              ]}
            />
            <Animated.View style={[styles.profile, profileStyle]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile.displayName.slice(0, 1)}</Text>
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {profile.displayName}
              </Text>
            </Animated.View>
          </View>
          <View pointerEvents="none" style={styles.shadow} />
        </Pressable>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, planetsStyle]} pointerEvents="box-none">
        {planets.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => onPressCircle(p.id)}
            style={[
              styles.planet,
              {
                left: p.x,
                top: p.y,
                backgroundColor: p.color,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={p.name}
          >
            <Text style={styles.planetSymbol}>{p.symbol}</Text>
            <Text style={styles.planetName} numberOfLines={1}>
              {p.name}
            </Text>
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
}

function StarField({ width, height }: { width: number; height: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        key: i,
        left: (i * 97) % width,
        top: (i * 53) % height,
        size: 1 + (i % 3),
        opacity: 0.25 + (i % 5) * 0.1,
      })),
    [width, height],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s) => (
        <View
          key={s.key}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: s.size,
            backgroundColor: '#fff',
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  sphereWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  sphereHit: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    opacity: 0.35,
  },
  sphere: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: INTRO_HANDOFF.sphere.glow,
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  highlight: {
    position: 'absolute',
    top: '18%',
    left: '22%',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  profile: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(20,16,12,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  name: {
    marginTop: 8,
    color: '#1a140e',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 120,
  },
  shadow: {
    position: 'absolute',
    bottom: -10,
    width: '70%',
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    opacity: 0.45,
  },
  planet: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  planetSymbol: { color: '#fff', fontSize: 16 },
  planetName: { color: '#fff', fontSize: 10, marginTop: 2, maxWidth: 60 },
});
