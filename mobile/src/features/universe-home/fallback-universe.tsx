import { useEffect, useMemo, useState } from 'react';
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
  fills: ['#FFE8F0', '#DFF4FF', '#E5F8E8', '#FFF3E0', '#F0EAFF', '#FFFCE8'] as const,
  inks: ['#B86B8C', '#5E8FB8', '#5F9A6E', '#B8925A', '#7E6EAF', '#A0924E'] as const,
  rings: [
    'rgba(255, 232, 240, 0.55)',
    'rgba(223, 244, 255, 0.5)',
    'rgba(229, 248, 232, 0.5)',
    'rgba(255, 243, 224, 0.5)',
    'rgba(240, 234, 255, 0.5)',
  ] as const,
  edge: 'rgba(255, 246, 238, 0.55)',
  edgeSoft: 'rgba(223, 244, 255, 0.35)',
};

/**
 * My Universe (2D):
 * - A (me) is the shared center — always visible
 * - Each circle is a large diagram ring wrapping A
 * - Tap a circle ring/chip → friends fan out with Obsidian-like links
 */
export function FallbackUniverse({
  profile,
  circles,
  friends = [],
  revealProfile,
  revealPlanets,
  onPressSelf,
  onPressCircle,
  onPressFriend,
  animateSettle = true,
}: {
  profile: Profile;
  circles: CircleSummary[];
  friends?: UniverseGraphFriend[];
  revealProfile: boolean;
  revealPlanets: boolean;
  onPressSelf: () => void;
  onPressCircle: (id: string) => void;
  onPressFriend?: (userId: string) => void;
  animateSettle?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const layout = resolveLiveHandoffLayout(width, height);
  const { diameter, left, top, cxPx, cyPx } = layout;
  const settleScale = resolveSettleScale(width, height);

  const [expandedCircleId, setExpandedCircleId] = useState<string | null>(null);
  const [hotId, setHotId] = useState<string | null>(null);

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
      setExpandedCircleId(null);
    }
  }, [revealProfile, animateSettle, settleScale, selfScale]);

  useEffect(() => {
    if (revealPlanets) {
      diagramOp.value = withTiming(1, {
        duration: 750,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      diagramOp.value = 0;
      setExpandedCircleId(null);
    }
  }, [revealPlanets, diagramOp]);

  const minSide = Math.min(width, height);
  // Rings wrapping A — each circle gets a larger enclosing diagram.
  const baseRing = minSide * 0.42;
  const ringStep = minSide * 0.1;

  const circleLayouts = useMemo(() => {
    return circles.map((c, i) => {
      const ring = baseRing + i * ringStep;
      // Label chip sits on the ring (staggered angles so they don't overlap).
      const angle = -Math.PI / 2 + i * ((Math.PI * 2) / Math.max(circles.length, 1)) * 0.85;
      const chipSize = Math.min(88, Math.max(68, width * 0.19));
      return {
        circle: c,
        ring,
        angle,
        chipX: cxPx + Math.cos(angle) * ring,
        chipY: cyPx + Math.sin(angle) * ring,
        chipSize,
        fill: PASTEL.fills[i % PASTEL.fills.length]!,
        ink: PASTEL.inks[i % PASTEL.inks.length]!,
        ringColor: PASTEL.rings[i % PASTEL.rings.length]!,
      };
    });
  }, [circles, baseRing, ringStep, cxPx, cyPx, width]);

  const expanded = circleLayouts.find((c) => c.circle.id === expandedCircleId) ?? null;
  const expandedFriends = useMemo(() => {
    if (!expanded) return [];
    return friends.filter(
      (f) => f.circleId === expanded.circle.id && f.userId !== profile.id,
    );
  }, [expanded, friends, profile.id]);

  const friendNodes = useMemo(() => {
    if (!expanded) return [];
    const n = Math.max(expandedFriends.length, 1);
    // Friends sit just inside the selected circle ring, linked to A and each other.
    const friendR = expanded.ring * 0.62;
    return expandedFriends.map((f, i) => {
      const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const size = Math.min(62, Math.max(48, width * 0.125));
      return {
        ...f,
        x: cxPx + Math.cos(angle) * friendR,
        y: cyPx + Math.sin(angle) * friendR,
        size,
        fill: PASTEL.fills[(i + 2) % PASTEL.fills.length]!,
        ink: PASTEL.inks[(i + 2) % PASTEL.inks.length]!,
      };
    });
  }, [expanded, expandedFriends, cxPx, cyPx, width]);

  const selfStyle = useAnimatedStyle(() => ({
    transform: [{ scale: selfScale.value }],
  }));
  const diagramStyle = useAnimatedStyle(() => ({
    opacity: diagramOp.value,
  }));

  const glowPad = 0.12;
  const hit = diameter * (1 + glowPad * 2);
  const avatar = Math.max(28, diameter * 0.32);

  const toggleCircle = (id: string) => {
    setExpandedCircleId((cur) => (cur === id ? null : id));
  };

  return (
    <View style={[styles.root, { width, height, backgroundColor: INTRO_HANDOFF.spaceBg }]}>
      <StarField width={width} height={height} />

      <Animated.View
        style={[StyleSheet.absoluteFill, diagramStyle]}
        pointerEvents={revealPlanets ? 'box-none' : 'none'}
      >
        {/* Each circle = diagram ring wrapping A (common center) */}
        {circleLayouts.map((c) => {
          const active = expandedCircleId === c.circle.id;
          return (
            <View key={c.circle.id} pointerEvents="box-none">
              {/* Diagram ring wrapping A — visual only; chip is the tap target */}
              <View
                pointerEvents="none"
                style={[
                  styles.ringHit,
                  {
                    left: cxPx - c.ring,
                    top: cyPx - c.ring,
                    width: c.ring * 2,
                    height: c.ring * 2,
                    borderRadius: c.ring,
                    borderColor: active ? c.fill : c.ringColor,
                    borderWidth: active ? 3 : 2,
                    backgroundColor: active ? 'rgba(255,253,248,0.06)' : 'transparent',
                  },
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.ringHair,
                  {
                    left: cxPx - c.ring * 0.86,
                    top: cyPx - c.ring * 0.86,
                    width: c.ring * 1.72,
                    height: c.ring * 1.72,
                    borderRadius: c.ring * 0.86,
                    borderColor: c.ringColor,
                  },
                ]}
              />
              <CircleChip
                label={c.circle.name}
                symbol={c.circle.symbol}
                x={c.chipX}
                y={c.chipY}
                size={c.chipSize}
                fill={c.fill}
                ink={c.ink}
                hot={hotId === `circle:${c.circle.id}` || active}
                onHotChange={(on) => setHotId(on ? `circle:${c.circle.id}` : null)}
                onPress={() => toggleCircle(c.circle.id)}
                onOpen={() => onPressCircle(c.circle.id)}
              />
            </View>
          );
        })}

        {/* Expanded circle → Obsidian friend links around A */}
        {expanded && friendNodes.length > 0 ? (
          <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
            {friendNodes.map((f) => (
              <EdgeLine
                key={`e-self-${f.userId}`}
                x1={cxPx}
                y1={cyPx}
                x2={f.x}
                y2={f.y}
                color={PASTEL.edge}
              />
            ))}
            {friendNodes.map((f, i) => {
              const next = friendNodes[(i + 1) % friendNodes.length];
              if (!next || friendNodes.length < 2) return null;
              // Soft ring among friends (Obsidian cluster)
              if (i === friendNodes.length - 1 && friendNodes.length > 2) {
                return (
                  <EdgeLine
                    key={`e-loop-${f.userId}`}
                    x1={f.x}
                    y1={f.y}
                    x2={next.x}
                    y2={next.y}
                    color={PASTEL.edgeSoft}
                  />
                );
              }
              if (i < friendNodes.length - 1) {
                return (
                  <EdgeLine
                    key={`e-f-${f.userId}-${next.userId}`}
                    x1={f.x}
                    y1={f.y}
                    x2={next.x}
                    y2={next.y}
                    color={PASTEL.edgeSoft}
                  />
                );
              }
              return null;
            })}
            {friendNodes.map((f) => (
              <FriendNode
                key={f.userId}
                label={f.displayName}
                x={f.x}
                y={f.y}
                size={f.size}
                fill={f.fill}
                ink={f.ink}
                hot={hotId === `friend:${f.userId}`}
                onHotChange={(on) => setHotId(on ? `friend:${f.userId}` : null)}
                onPress={() => onPressFriend?.(f.userId)}
              />
            ))}
          </View>
        ) : null}

        {expanded && friendNodes.length === 0 ? (
          <View
            pointerEvents="none"
            style={[styles.emptyHint, { top: cyPx + expanded.ring * 0.15 }]}
          >
            <Text style={styles.emptyHintText}>No friends in this circle yet</Text>
          </View>
        ) : null}
      </Animated.View>

      {/* A — common center of every circle diagram */}
      <Animated.View
        style={[
          styles.sphereWrap,
          {
            left: left - diameter * glowPad,
            top: top - diameter * glowPad,
            width: hit,
            height: hit,
            zIndex: 8,
          },
          selfStyle,
        ]}
      >
        <Pressable
          onPress={onPressSelf}
          onPressIn={() => setHotId('self')}
          onPressOut={() => setHotId(null)}
          onHoverIn={() => setHotId('self')}
          onHoverOut={() => setHotId(null)}
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
                transform: [{ scale: hotId === 'self' ? 1.1 : 1 }],
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

function CircleChip({
  label,
  symbol,
  x,
  y,
  size,
  fill,
  ink,
  hot,
  onHotChange,
  onPress,
  onOpen,
}: {
  label: string;
  symbol: string;
  x: number;
  y: number;
  size: number;
  fill: string;
  ink: string;
  hot: boolean;
  onHotChange: (on: boolean) => void;
  onPress: () => void;
  onOpen: () => void;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withTiming(hot ? 1.34 : 1, {
      duration: hot ? 140 : 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [hot, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        styles.chipWrap,
        { left: x - size / 2, top: y - size / 2, width: size, height: size },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onOpen}
        onPressIn={() => onHotChange(true)}
        onPressOut={() => onHotChange(false)}
        onHoverIn={() => onHotChange(true)}
        onHoverOut={() => onHotChange(false)}
        style={[
          styles.chip,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: fill,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[styles.chipSymbol, { color: ink, fontSize: size * 0.18 }]}>{symbol}</Text>
        <Text
          style={[styles.chipLabel, { color: ink, fontSize: Math.max(9, size * 0.12), maxWidth: size * 0.85 }]}
          numberOfLines={2}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function FriendNode({
  label,
  x,
  y,
  size,
  fill,
  ink,
  hot,
  onHotChange,
  onPress,
}: {
  label: string;
  x: number;
  y: number;
  size: number;
  fill: string;
  ink: string;
  hot: boolean;
  onHotChange: (on: boolean) => void;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withTiming(hot ? 1.4 : 1, {
      duration: hot ? 140 : 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [hot, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      style={[
        styles.chipWrap,
        { left: x - size / 2, top: y - size / 2, width: size, height: size, zIndex: 6 },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => onHotChange(true)}
        onPressOut={() => onHotChange(false)}
        onHoverIn={() => onHotChange(true)}
        onHoverOut={() => onHotChange(false)}
        style={[
          styles.chip,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: fill,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Text style={[styles.chipLabel, { color: ink, fontSize: Math.max(10, size * 0.16) }]} numberOfLines={1}>
          {label.slice(0, 1)}
        </Text>
        <Text
          style={[styles.chipLabel, { color: ink, fontSize: Math.max(8, size * 0.13), maxWidth: size * 0.85 }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function EdgeLine({
  x1,
  y1,
  x2,
  y2,
  color,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: (x1 + x2) / 2 - len / 2,
        top: (y1 + y2) / 2 - 1,
        width: len,
        height: 2,
        borderRadius: 1,
        backgroundColor: color,
        transform: [{ rotate: `${angle}deg` }],
        zIndex: 4,
      }}
    />
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
  ringHit: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  ringHair: {
    position: 'absolute',
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
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
    shadowColor: INTRO_HANDOFF.sphere.glow,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
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
  chipWrap: { position: 'absolute', zIndex: 7 },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#F0E6F8',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  chipSymbol: { fontWeight: '600' },
  chipLabel: { marginTop: 2, fontWeight: '600', textAlign: 'center' },
  emptyHint: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  emptyHintText: { color: 'rgba(247,244,239,0.65)', fontSize: 12 },
});
