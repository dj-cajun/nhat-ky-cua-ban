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
  edge: 'rgba(255, 232, 240, 0.42)',
  edgeSoft: 'rgba(223, 244, 255, 0.28)',
  label: 'rgba(247, 244, 239, 0.9)',
};

type GraphNode = {
  id: string;
  kind: 'self' | 'circle' | 'friend';
  label: string;
  symbol?: string;
  x: number;
  y: number;
  size: number;
  fill: string;
  ink: string;
};

type GraphEdge = { id: string; a: string; b: string; soft?: boolean };

/**
 * Obsidian-like knowledge graph: me ↔ circles ↔ friends.
 * Intro lands on a large self orb, settles smaller, nodes react on touch.
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

  const [hotId, setHotId] = useState<string | null>(null);

  const selfScale = useSharedValue(revealProfile && !animateSettle ? settleScale : 1);
  const graphOp = useSharedValue(0);
  const graphZoom = useSharedValue(revealPlanets || (revealProfile && !animateSettle) ? 1 : 1.25);

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
    if (revealPlanets) {
      graphOp.value = withTiming(1, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      });
      graphZoom.value = withTiming(1, {
        duration: INTRO_HANDOFF.settleDurationSec * 1000,
        easing: Easing.out(Easing.quad),
      });
    } else {
      graphOp.value = 0;
      graphZoom.value = 1.25;
    }
  }, [revealPlanets, graphOp, graphZoom]);

  const { nodes, edges, byId } = useMemo(
    () => buildGraph({ profile, circles, friends, cxPx, cyPx, width, height }),
    [profile, circles, friends, cxPx, cyPx, width, height],
  );

  const selfStyle = useAnimatedStyle(() => ({
    transform: [{ scale: selfScale.value }],
  }));

  const graphStyle = useAnimatedStyle(() => ({
    opacity: graphOp.value,
    transform: [{ scale: graphZoom.value }],
  }));

  const glowPad = 0.12;
  const hit = diameter * (1 + glowPad * 2);
  const avatar = Math.max(28, diameter * 0.32);

  return (
    <View style={[styles.root, { width, height, backgroundColor: INTRO_HANDOFF.spaceBg }]}>
      <StarField width={width} height={height} />

      {/* Knowledge edges + circle/friend nodes (Obsidian-like) */}
      <Animated.View
        style={[StyleSheet.absoluteFill, graphStyle]}
        pointerEvents={revealPlanets ? 'box-none' : 'none'}
      >
        {edges.map((e) => {
          const a = byId.get(e.a);
          const b = byId.get(e.b);
          if (!a || !b) return null;
          return (
            <EdgeLine
              key={e.id}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              color={e.soft ? PASTEL.edgeSoft : PASTEL.edge}
            />
          );
        })}

        {nodes
          .filter((n) => n.kind !== 'self')
          .map((n) => (
            <GraphNodeView
              key={n.id}
              node={n}
              hot={hotId === n.id}
              onHotChange={(on) => setHotId(on ? n.id : null)}
              onPress={() => {
                if (n.kind === 'circle') onPressCircle(n.id.replace(/^circle:/, ''));
                if (n.kind === 'friend') onPressFriend?.(n.id.replace(/^friend:/, ''));
              }}
            />
          ))}
      </Animated.View>

      {/* Self = intro handoff orb (settles small into the graph center) */}
      <Animated.View
        style={[
          styles.sphereWrap,
          {
            left: left - diameter * glowPad,
            top: top - diameter * glowPad,
            width: hit,
            height: hit,
            zIndex: 5,
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
                transform: [{ scale: hotId === 'self' ? 1.08 : 1 }],
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
                  style={[styles.name, { fontSize: Math.max(10, diameter * 0.07), maxWidth: diameter * 0.7 }]}
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

function GraphNodeView({
  node,
  hot,
  onHotChange,
  onPress,
}: {
  node: GraphNode;
  hot: boolean;
  onHotChange: (on: boolean) => void;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withTiming(hot ? 1.38 : 1, {
      duration: hot ? 140 : 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [hot, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.nodeWrap,
        {
          left: node.x - node.size / 2,
          top: node.y - node.size / 2,
          width: node.size,
          height: node.size,
        },
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
          styles.node,
          {
            width: node.size,
            height: node.size,
            borderRadius: node.size / 2,
            backgroundColor: node.fill,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={node.label}
      >
        {node.symbol ? (
          <Text style={[styles.nodeSymbol, { color: node.ink, fontSize: node.size * 0.2 }]}>
            {node.symbol}
          </Text>
        ) : null}
        <Text
          style={[
            styles.nodeLabel,
            {
              color: node.ink,
              fontSize: Math.max(9, node.size * (node.kind === 'circle' ? 0.12 : 0.14)),
              maxWidth: node.size * 0.88,
            },
          ]}
          numberOfLines={2}
        >
          {node.label}
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
      }}
    />
  );
}

function buildGraph(opts: {
  profile: Profile;
  circles: CircleSummary[];
  friends: UniverseGraphFriend[];
  cxPx: number;
  cyPx: number;
  width: number;
  height: number;
}): { nodes: GraphNode[]; edges: GraphEdge[]; byId: Map<string, GraphNode> } {
  const { profile, circles, friends, cxPx, cyPx, width, height } = opts;
  const minSide = Math.min(width, height);
  const circleRing = minSide * 0.28;
  const friendRing = minSide * 0.16;

  const nodes: GraphNode[] = [
    {
      id: 'self',
      kind: 'self',
      label: profile.displayName,
      x: cxPx,
      y: cyPx,
      size: 56,
      fill: INTRO_HANDOFF.sphere.color,
      ink: '#2A2430',
    },
  ];
  const edges: GraphEdge[] = [];

  const n = Math.max(circles.length, 1);
  circles.forEach((c, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const id = `circle:${c.id}`;
    const fill = PASTEL.fills[i % PASTEL.fills.length]!;
    const ink = PASTEL.inks[i % PASTEL.inks.length]!;
    const x = cxPx + Math.cos(angle) * circleRing;
    const y = cyPx + Math.sin(angle) * circleRing;
    nodes.push({
      id,
      kind: 'circle',
      label: c.name,
      symbol: c.symbol,
      x,
      y,
      size: Math.min(92, Math.max(70, width * 0.2)),
      fill,
      ink,
    });
    edges.push({ id: `e:self-${id}`, a: 'self', b: id });

    const members = friends.filter((f) => f.circleId === c.id && f.userId !== profile.id);
    const mCount = Math.max(members.length, 1);
    members.forEach((f, fi) => {
      // Fan friends around the circle hub (Obsidian cluster feel).
      const spread = Math.min(Math.PI * 0.9, 0.55 + members.length * 0.18);
      const local =
        members.length === 1
          ? angle
          : angle - spread / 2 + (fi / (mCount - 1 || 1)) * spread;
      const fid = `friend:${f.userId}`;
      // Avoid duplicate friend nodes across circles — first circle wins hub edge,
      // later circles only add soft edge to that circle.
      const existing = nodes.find((node) => node.id === fid);
      if (existing) {
        edges.push({ id: `e:${id}-${fid}`, a: id, b: fid, soft: true });
        return;
      }
      const fx = x + Math.cos(local) * friendRing;
      const fy = y + Math.sin(local) * friendRing;
      nodes.push({
        id: fid,
        kind: 'friend',
        label: f.displayName,
        x: fx,
        y: fy,
        size: Math.min(64, Math.max(48, width * 0.13)),
        fill: PASTEL.fills[(i + fi + 2) % PASTEL.fills.length]!,
        ink: PASTEL.inks[(i + fi + 2) % PASTEL.inks.length]!,
      });
      edges.push({ id: `e:${id}-${fid}`, a: id, b: fid });
      edges.push({ id: `e:self-${fid}`, a: 'self', b: fid, soft: true });
    });
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));
  return { nodes, edges, byId };
}

function StarField({ width, height }: { width: number; height: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        key: i,
        left: (i * 97) % width,
        top: (i * 53) % height,
        size: 1 + (i % 2),
        opacity: 0.16 + (i % 5) * 0.05,
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
  },
  sphereHit: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: { position: 'absolute', opacity: 0.2 },
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
  nodeWrap: { position: 'absolute', zIndex: 3 },
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
    shadowColor: '#F0E6F8',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  nodeSymbol: { fontWeight: '600' },
  nodeLabel: { marginTop: 2, fontWeight: '600', textAlign: 'center' },
});
