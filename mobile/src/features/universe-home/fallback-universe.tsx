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
import { resolveLiveHandoffLayout, resolveSettleScale } from './handoff-layout';

/** Soft pastel diagram tokens (not neon space UI). */
const DIAGRAM = {
  ring: 'rgba(255, 232, 240, 0.55)',
  ringSoft: 'rgba(223, 244, 255, 0.35)',
  ringHair: 'rgba(240, 234, 255, 0.28)',
  nodeFill: ['#FFE8F0', '#DFF4FF', '#E5F8E8', '#FFF3E0', '#F0EAFF', '#FFFCE8'] as const,
  nodeInk: ['#B86B8C', '#5E8FB8', '#5F9A6E', '#B8925A', '#7E6EAF', '#A0924E'] as const,
  nodeBorder: 'rgba(255,255,255,0.65)',
  label: 'rgba(255, 246, 238, 0.92)',
};

/**
 * Web / GL-fail universe: intro-sized orb settles small;
 * friends circles wrap it as a large pastel orbit diagram.
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
  const layout = resolveLiveHandoffLayout(width, height);
  const { diameter, left, top, cxPx, cyPx } = layout;
  const settleScale = resolveSettleScale(width, height);

  const floatY = useSharedValue(0);
  const profileOp = useSharedValue(0);
  const planetOp = useSharedValue(0);
  const sizeScale = useSharedValue(revealProfile && !animateSettle ? settleScale : 1);

  // Large diagram ring — wraps the settled center orb.
  const ringOuter = Math.min(width, height) * 0.82;
  const ringMid = ringOuter * 0.86;
  const ringInner = ringOuter * 0.72;
  const orbitR = ringMid / 2;
  const nodeSize = Math.min(104, Math.max(72, width * 0.22));

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(5, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
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
            easing: Easing.out(Easing.quad),
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
      revealPlanets ? 160 : 0,
      withTiming(revealPlanets ? 1 : 0, {
        duration: INTRO_HANDOFF.planetsStaggerSec * 1000,
        easing: Easing.out(Easing.cubic),
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
    transform: [{ scale: 0.92 + planetOp.value * 0.08 }],
  }));

  const planets = useMemo(() => {
    const n = Math.max(circles.length, 1);
    return circles.map((c, i) => {
      // Even spacing on the large diagram ring (start at top).
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const fill = DIAGRAM.nodeFill[i % DIAGRAM.nodeFill.length]!;
      const ink = DIAGRAM.nodeInk[i % DIAGRAM.nodeInk.length]!;
      return {
        ...c,
        fill,
        ink,
        x: cxPx + Math.cos(angle) * orbitR - nodeSize / 2,
        y: cyPx + Math.sin(angle) * orbitR - nodeSize / 2,
      };
    });
  }, [circles, cxPx, cyPx, orbitR, nodeSize]);

  const glowPad = 0.12;
  const hit = diameter * (1 + glowPad * 2);
  // Profile chrome scales with intro diameter (then whole orb settle-scales).
  const avatar = Math.max(28, diameter * 0.32);
  const nameSize = Math.max(10, diameter * 0.075);

  return (
    <View style={[styles.root, { width, height, backgroundColor: INTRO_HANDOFF.spaceBg }]}>
      <StarField width={width} height={height} />

      {/* Pastel orbit diagram — large rings wrapping the center orb */}
      <Animated.View
        style={[StyleSheet.absoluteFill, planetsStyle]}
        pointerEvents="none"
      >
        <View
          style={[
            styles.ring,
            {
              left: cxPx - ringOuter / 2,
              top: cyPx - ringOuter / 2,
              width: ringOuter,
              height: ringOuter,
              borderRadius: ringOuter / 2,
              borderColor: DIAGRAM.ringSoft,
              borderWidth: 1,
            },
          ]}
        />
        <View
          style={[
            styles.ring,
            {
              left: cxPx - ringMid / 2,
              top: cyPx - ringMid / 2,
              width: ringMid,
              height: ringMid,
              borderRadius: ringMid / 2,
              borderColor: DIAGRAM.ring,
              borderWidth: 2,
            },
          ]}
        />
        <View
          style={[
            styles.ring,
            {
              left: cxPx - ringInner / 2,
              top: cyPx - ringInner / 2,
              width: ringInner,
              height: ringInner,
              borderRadius: ringInner / 2,
              borderColor: DIAGRAM.ringHair,
              borderWidth: 1,
              borderStyle: 'dashed',
            },
          ]}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sphereWrap,
          {
            left: left - diameter * glowPad,
            top: top - diameter * glowPad,
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
              <View
                style={[
                  styles.avatar,
                  {
                    width: avatar,
                    height: avatar,
                    borderRadius: avatar / 2,
                  },
                ]}
              >
                <Text style={[styles.avatarText, { fontSize: avatar * 0.42 }]}>
                  {profile.displayName.slice(0, 1)}
                </Text>
              </View>
              <Text
                style={[styles.name, { fontSize: nameSize, maxWidth: diameter * 0.7 }]}
                numberOfLines={1}
              >
                {profile.displayName}
              </Text>
            </Animated.View>
          </View>
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
                width: nodeSize,
                height: nodeSize,
                borderRadius: nodeSize / 2,
                backgroundColor: p.fill,
                borderColor: DIAGRAM.nodeBorder,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={p.name}
          >
            <Text style={[styles.planetSymbol, { color: p.ink, fontSize: nodeSize * 0.22 }]}>
              {p.symbol}
            </Text>
            <Text
              style={[styles.planetName, { color: p.ink, fontSize: nodeSize * 0.12, maxWidth: nodeSize * 0.85 }]}
              numberOfLines={2}
            >
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
      Array.from({ length: 36 }, (_, i) => ({
        key: i,
        left: (i * 97) % width,
        top: (i * 53) % height,
        size: 1 + (i % 2),
        opacity: 0.18 + (i % 5) * 0.06,
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
  ring: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
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
    opacity: 0.2,
  },
  sphere: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: INTRO_HANDOFF.sphere.glow,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  highlight: {
    position: 'absolute',
    top: '18%',
    left: '22%',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  profile: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  avatar: {
    backgroundColor: 'rgba(42, 36, 48, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { color: '#fff', fontWeight: '700' },
  name: {
    marginTop: 6,
    color: '#2A2430',
    fontWeight: '700',
  },
  planet: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1.5,
    shadowColor: '#F0E6F8',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  planetSymbol: { fontWeight: '600' },
  planetName: {
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
});
