import { useEffect, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { CircleSummary, Profile } from '@/types/domain';
import { INTRO_HANDOFF } from './handoff';
import { resolveLiveHandoffLayout, resolveSettleScale } from './handoff-layout';

export type UniverseGraphFriend = {
  userId: string;
  displayName: string;
  circleId: string;
};

const PASTEL = {
  fills: [
    'rgba(255, 232, 240, 0.42)',
    'rgba(223, 244, 255, 0.40)',
    'rgba(229, 248, 232, 0.40)',
    'rgba(255, 243, 224, 0.40)',
    'rgba(240, 234, 255, 0.40)',
  ] as const,
  borders: ['#E8A4C4', '#9EC5E8', '#A8D5B0', '#E8C9A0', '#C9B8E8'] as const,
  ink: ['#8B4F6A', '#3F6F96', '#3F7A4E', '#8A6A3A', '#5E4F8A'] as const,
};

/**
 * My Universe home:
 * - A is the shared center (always visible)
 * - Each circle = large pastel-filled disk wrapping A (content as text in the fill, not chip-nodes)
 * - Tap a circle → open friends graph page
 */
export function FallbackUniverse({
  profile,
  circles,
  friends = [],
  revealProfile,
  revealPlanets,
  onPressSelf,
  onPressCircle,
  animateSettle = true,
}: {
  profile: Profile;
  circles: CircleSummary[];
  friends?: UniverseGraphFriend[];
  revealProfile: boolean;
  revealPlanets: boolean;
  onPressSelf: () => void;
  onPressCircle: (id: string) => void;
  animateSettle?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const layout = resolveLiveHandoffLayout(width, height);
  const { diameter, left, top, cxPx, cyPx } = layout;
  const settleScale = resolveSettleScale(width, height);

  const selfScale = useSharedValue(revealProfile && !animateSettle ? settleScale : 1);
  const diagramOp = useSharedValue(0);

  useEffect(() => {
    if (revealProfile) {
      selfScale.value = animateSettle
        ? withTiming(settleScale, {
            duration: INTRO_HANDOFF.settleDurationSec * 1000,
            easing: Easing.out(Easing.quad),
          })
        : settleScale;
    } else {
      selfScale.value = 1;
    }
  }, [revealProfile, animateSettle, settleScale, selfScale]);

  useEffect(() => {
    diagramOp.value = revealPlanets
      ? withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) })
      : 0;
  }, [revealPlanets, diagramOp]);

  const minSide = Math.min(width, height);
  const baseRing = minSide * 0.38;
  const ringStep = minSide * 0.11;

  const circleDisks = useMemo(() => {
    // Paint large → small so inner disks sit above outer fills; A stays on top.
    return circles
      .map((c, i) => {
        const ring = baseRing + (circles.length - 1 - i) * ringStep;
        const angle = -Math.PI / 2 + i * 0.7;
        // Content sits in the pastel band (not a round chip).
        const labelR = ring * 0.72;
        return {
          circle: c,
          ring,
          z: i + 1,
          fill: PASTEL.fills[i % PASTEL.fills.length]!,
          border: PASTEL.borders[i % PASTEL.borders.length]!,
          ink: PASTEL.ink[i % PASTEL.ink.length]!,
          labelX: cxPx + Math.cos(angle) * labelR,
          labelY: cyPx + Math.sin(angle) * labelR,
          friendCount: friends.filter((f) => f.circleId === c.id && f.userId !== profile.id)
            .length,
        };
      })
      .sort((a, b) => b.ring - a.ring);
  }, [circles, friends, profile.id, baseRing, ringStep, cxPx, cyPx]);

  const selfStyle = useAnimatedStyle(() => ({
    transform: [{ scale: selfScale.value }],
  }));
  const diagramStyle = useAnimatedStyle(() => ({
    opacity: diagramOp.value,
  }));

  const glowPad = 0.12;
  const hit = diameter * (1 + glowPad * 2);
  const avatar = Math.max(28, diameter * 0.32);

  return (
    <View style={[styles.root, { width, height, backgroundColor: INTRO_HANDOFF.spaceBg }]}>
      <StarField width={width} height={height} />

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          diagramStyle,
          { pointerEvents: revealPlanets ? 'box-none' : 'none' },
        ]}
      >
        {circleDisks.map((c) => (
          <View key={c.circle.id} style={{ zIndex: c.z, pointerEvents: 'box-none' }}>
            {/* Pastel-filled large circle wrapping A */}
            <Pressable
              onPress={() => onPressCircle(c.circle.id)}
              accessibilityRole="button"
              accessibilityLabel={c.circle.name}
              style={[
                styles.disk,
                {
                  left: cxPx - c.ring,
                  top: cyPx - c.ring,
                  width: c.ring * 2,
                  height: c.ring * 2,
                  borderRadius: c.ring,
                  backgroundColor: c.fill,
                  borderColor: c.border,
                },
              ]}
            />
            {/* Content inside the pastel disk — text, not a round node */}
            <Pressable
              onPress={() => onPressCircle(c.circle.id)}
              style={[
                styles.inDiskContent,
                {
                  left: c.labelX - 70,
                  top: c.labelY - 28,
                  width: 140,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={c.circle.name}
            >
              <Text style={[styles.inDiskSymbol, { color: c.ink }]}>{c.circle.symbol}</Text>
              <Text style={[styles.inDiskTitle, { color: c.ink }]} numberOfLines={2}>
                {c.circle.name}
              </Text>
              <Text style={[styles.inDiskMeta, { color: c.ink }]}>
                {c.friendCount > 0
                  ? `${c.friendCount} friends · tap`
                  : `${c.circle.activeMemberCount} members · tap`}
              </Text>
            </Pressable>
          </View>
        ))}
      </Animated.View>

      {/* A — common center, always above pastel disks */}
      <Animated.View
        style={[
          styles.sphereWrap,
          {
            left: left - diameter * glowPad,
            top: top - diameter * glowPad,
            width: hit,
            height: hit,
            zIndex: 20,
          },
          selfStyle,
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
            style={[
              styles.glow,
              {
                width: hit,
                height: hit,
                borderRadius: hit / 2,
                backgroundColor: INTRO_HANDOFF.sphere.glow,
                pointerEvents: 'none',
              },
            ]}
          />
          <View
            style={[
              styles.sphere,
              {
                width: diameter,
                height: diameter,
                borderRadius: diameter / 2,
                backgroundColor: INTRO_HANDOFF.sphere.color,
                pointerEvents: 'none',
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
            {revealProfile ? (
              <View style={styles.profile}>
                <View
                  style={[
                    styles.avatar,
                    { width: avatar, height: avatar, borderRadius: avatar / 2 },
                  ]}
                >
                  <Text style={[styles.avatarText, { fontSize: avatar * 0.42 }]}>
                    {profile.displayName.slice(0, 1)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.name,
                    { fontSize: Math.max(10, diameter * 0.07), maxWidth: diameter * 0.75 },
                  ]}
                  numberOfLines={1}
                >
                  {profile.displayName}
                </Text>
              </View>
            ) : null}
          </View>
        </Pressable>
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
        opacity: 0.14 + (i % 5) * 0.05,
      })),
    [width, height],
  );
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
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
  disk: {
    position: 'absolute',
    borderWidth: 2,
  },
  inDiskContent: {
    position: 'absolute',
    zIndex: 5,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  inDiskSymbol: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  inDiskTitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  inDiskMeta: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.85,
  },
  sphereWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sphereHit: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: { position: 'absolute', opacity: 0.22 },
  sphere: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // RN web: prefer boxShadow over deprecated shadow* props
    boxShadow: `0 6px 18px ${INTRO_HANDOFF.sphere.glow}80`,
    elevation: 10,
  },
  highlight: {
    position: 'absolute',
    top: '18%',
    left: '22%',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  profile: { alignItems: 'center', paddingHorizontal: 8 },
  avatar: {
    backgroundColor: 'rgba(42, 36, 48, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { color: '#fff', fontWeight: '700' },
  name: { marginTop: 6, color: '#2A2430', fontWeight: '700' },
});
