import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppErrorState,
  AppForbiddenState,
  AppLoadingState,
} from '@/components/states';
import {
  getCircle,
  getProfile,
  getSessionProfile,
  isCircleMember,
  listCircleMembers,
} from '@/features/local/repository';
import type { Circle, Profile } from '@/types/domain';
import { toAppError } from '@/lib/errors';
import { useMessages } from '@/i18n';

const GRAPH = {
  space: '#F3EEE6',
  spaceDeep: '#E8E0D4',
  ink: '#3A322A',
  muted: 'rgba(58,50,42,0.55)',
  edge: 'rgba(58,50,42,0.28)',
  edgeHot: 'rgba(180,120,60,0.55)',
  self: '#E8B45A',
  selfGlow: 'rgba(240,195,106,0.35)',
  node: '#F7F3EC',
  nodeBorder: 'rgba(58,50,42,0.18)',
};

type Friend = { id: string; name: string };

type ProjectedNode = Friend & {
  x: number;
  y: number;
  z: number;
  scale: number;
  opacity: number;
  /** screen depth sort key */
  depth: number;
};

/**
 * Project a point on a unit sphere with slight yaw/pitch into 2D + depth.
 * Gives an Obsidian-like spatial graph without requiring GL on web.
 */
function projectSphere(
  theta: number,
  phi: number,
  radius: number,
  cx: number,
  cy: number,
  yaw: number,
  pitch: number,
): { x: number; y: number; z: number; scale: number; opacity: number; depth: number } {
  // Spherical → cartesian
  let x = Math.sin(phi) * Math.cos(theta);
  let y = Math.cos(phi);
  let z = Math.sin(phi) * Math.sin(theta);

  // yaw around Y
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x1 = x * cosY + z * sinY;
  const z1 = -x * sinY + z * cosY;
  x = x1;
  z = z1;

  // pitch around X
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const y1 = y * cosP - z * sinP;
  const z2 = y * sinP + z * cosP;
  y = y1;
  z = z2;

  const perspective = 2.6;
  const depth = (z + 1) / 2; // 0..1 front
  const persp = perspective / (perspective - z);
  const scale = 0.72 + depth * 0.55;
  const opacity = 0.45 + depth * 0.55;

  return {
    x: cx + x * radius * persp,
    y: cy + y * radius * persp * 0.92,
    z,
    scale,
    opacity,
    depth,
  };
}

/**
 * Circle friends page — Obsidian-style: nodes linked by thin lines only,
 * laid out on a soft 3D sphere (perspective + slow drift).
 */
export default function CircleGraphScreen() {
  const t = useMessages();
  const { width, height } = useWindowDimensions();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const [me, setMe] = useState<Profile | null>(null);
  const [circle, setCircle] = useState<Circle | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hotId, setHotId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(async () => {
    setError('');
    try {
      const session = await getSessionProfile();
      if (!session || !circleId) {
        router.replace('/(auth)/sign-in');
        return;
      }
      if (!(await isCircleMember(circleId, session.id))) {
        setForbidden(true);
        return;
      }
      setForbidden(false);
      setMe(session);
      setCircle(await getCircle(circleId));
      const members = await listCircleMembers(circleId, session.id);
      const rows: Friend[] = [];
      for (const m of members) {
        if (m.userId === session.id) continue;
        const p = await getProfile(m.userId);
        if (p) rows.push({ id: p.id, name: p.displayName });
      }
      setFriends(rows);
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setLoading(false);
    }
  }, [circleId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // Slow continuous yaw for a living 3D graph (Obsidian vault feel).
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 48);
    return () => clearInterval(id);
  }, []);

  const cx = width / 2;
  const cy = height * 0.44;
  const radius = Math.min(width, height) * 0.34;
  const yaw = tick * 0.012;
  const pitch = 0.22 + Math.sin(tick * 0.008) * 0.06;

  const nodes: ProjectedNode[] = useMemo(() => {
    const n = friends.length;
    if (n === 0) return [];
    return friends.map((f, i) => {
      // Fibonacci-ish sphere distribution so links read in 3D space
      const golden = Math.PI * (3 - Math.sqrt(5));
      const y = 1 - (i / Math.max(n - 1, 1)) * 2; // 1 → -1
      const phi = Math.acos(Math.max(-1, Math.min(1, y)));
      const theta = golden * i + i * 0.35;
      const projected = projectSphere(theta, phi, radius, cx, cy, yaw, pitch);
      return { ...f, ...projected };
    });
  }, [friends, radius, cx, cy, yaw, pitch]);

  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => a.depth - b.depth),
    [nodes],
  );

  // Line edges: only me → friend (hub), plus a few near-neighbor links for Obsidian density.
  const neighborEdges = useMemo(() => {
    const edges: { a: ProjectedNode; b: ProjectedNode }[] = [];
    if (nodes.length < 2) return edges;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]!;
      let best: ProjectedNode | null = null;
      let bestD = Infinity;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const b = nodes[j]!;
        const d =
          (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2 * radius * radius;
        if (d < bestD) {
          bestD = d;
          best = b;
        }
      }
      if (best && a.id < best.id) edges.push({ a, b: best });
    }
    return edges;
  }, [nodes, radius]);

  if (loading && !me) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppLoadingState />
      </SafeAreaView>
    );
  }

  if (forbidden) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppForbiddenState
          title={t.states.forbiddenTitle}
          subtitle={t.states.forbiddenSub}
          actionLabel={t.diary.back}
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  if (!me || !circle) {
    return (
      <SafeAreaView style={styles.safe}>
        {error ? <AppErrorState message={error} onRetry={() => void reload()} /> : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← {t.universe.brand}</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {circle.symbol} {circle.name}
        </Text>
        <Pressable onPress={() => router.push(`/circles/${circle.id}`)} hitSlop={12}>
          <Text style={styles.open}>{t.universe.tapPlanet}</Text>
        </Pressable>
      </View>

      <View style={styles.stage}>
        {/* Soft depth wash — no filled disk; the graph is lines */}
        <View
          pointerEvents="none"
          style={[
            styles.depthWash,
            {
              left: cx - radius * 1.35,
              top: cy - radius * 1.15,
              width: radius * 2.7,
              height: radius * 2.3,
              borderRadius: radius * 1.35,
            },
          ]}
        />

        {/* Hub edges: me → each friend */}
        {nodes.map((n) => (
          <EdgeLine
            key={`hub-${n.id}`}
            x1={cx}
            y1={cy}
            x2={n.x}
            y2={n.y}
            color={hotId === n.id ? GRAPH.edgeHot : GRAPH.edge}
            thickness={hotId === n.id ? 1.6 : 1}
            opacity={0.35 + n.depth * 0.45}
          />
        ))}

        {/* Sparse neighbor links */}
        {neighborEdges.map(({ a, b }) => (
          <EdgeLine
            key={`n-${a.id}-${b.id}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            color={GRAPH.edge}
            thickness={0.8}
            opacity={0.18 + Math.min(a.depth, b.depth) * 0.25}
          />
        ))}

        {sortedNodes.map((n) => (
          <GraphNode
            key={n.id}
            name={n.name}
            x={n.x}
            y={n.y}
            scale={n.scale}
            opacity={n.opacity}
            hot={hotId === n.id}
            onHot={(on) => setHotId(on ? n.id : null)}
            onPress={() => router.push(`/diary/${n.id}`)}
          />
        ))}

        {/* A — shared center */}
        <Pressable
          onPress={() => router.push(`/diary/${me.id}`)}
          style={[styles.selfWrap, { left: cx - 28, top: cy - 28 }]}
          accessibilityRole="button"
          accessibilityLabel={me.displayName}
        >
          <View style={styles.selfGlow} />
          <View style={styles.selfOrb}>
            <Text style={styles.selfLetter}>{me.displayName.slice(0, 1)}</Text>
          </View>
          <Text style={styles.selfName} numberOfLines={1}>
            {me.displayName}
          </Text>
        </Pressable>

        {friends.length === 0 ? (
          <Text style={[styles.empty, { top: cy + radius * 0.35 }]}>
            No friends in this circle yet
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function GraphNode({
  name,
  x,
  y,
  scale,
  opacity,
  hot,
  onHot,
  onPress,
}: {
  name: string;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  hot: boolean;
  onHot: (on: boolean) => void;
  onPress: () => void;
}) {
  const pulse = useSharedValue(1);
  const hotScale = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.06, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  useEffect(() => {
    hotScale.value = withTiming(hot ? 1.45 : 1, {
      duration: hot ? 120 : 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [hot, hotScale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale * pulse.value * hotScale.value }],
    opacity,
  }));

  const size = 36;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          zIndex: 4 + Math.round(scale * 10),
          alignItems: 'center',
        },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={() => onHot(true)}
        onPressOut={() => onHot(false)}
        onHoverIn={() => onHot(true)}
        onHoverOut={() => onHot(false)}
        style={styles.nodeHit}
        accessibilityRole="button"
        accessibilityLabel={name}
      >
        <View style={[styles.nodeOrb, hot && styles.nodeOrbHot]}>
          <Text style={styles.nodeLetter}>{name.slice(0, 1)}</Text>
        </View>
        <Text style={[styles.nodeLabel, hot && styles.nodeLabelHot]} numberOfLines={1}>
          {name}
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
  thickness,
  opacity,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  thickness: number;
  opacity: number;
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
        top: (y1 + y2) / 2 - thickness / 2,
        width: len,
        height: thickness,
        borderRadius: thickness,
        backgroundColor: color,
        opacity,
        transform: [{ rotate: `${angle}deg` }],
        zIndex: 2,
      }}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GRAPH.space },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  back: { color: GRAPH.muted, fontSize: 13, fontWeight: '600' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: GRAPH.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  open: { color: GRAPH.muted, fontSize: 12, fontWeight: '600' },
  stage: { flex: 1 },
  depthWash: {
    position: 'absolute',
    backgroundColor: GRAPH.spaceDeep,
    opacity: 0.55,
  },
  selfWrap: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  selfGlow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: GRAPH.selfGlow,
  },
  selfOrb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GRAPH.self,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
    shadowColor: '#C48A2A',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  selfLetter: { color: '#fff', fontWeight: '800', fontSize: 16 },
  selfName: {
    position: 'absolute',
    top: 52,
    color: GRAPH.ink,
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 72,
    textAlign: 'center',
  },
  nodeHit: { alignItems: 'center', width: 56 },
  nodeOrb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GRAPH.node,
    borderWidth: 1,
    borderColor: GRAPH.nodeBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2A241C',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  nodeOrbHot: {
    borderColor: 'rgba(180,120,60,0.55)',
    backgroundColor: '#FFFCF6',
  },
  nodeLetter: { color: GRAPH.ink, fontWeight: '800', fontSize: 11 },
  nodeLabel: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '600',
    color: GRAPH.muted,
    maxWidth: 56,
    textAlign: 'center',
  },
  nodeLabelHot: { color: GRAPH.ink },
  empty: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: GRAPH.muted,
    fontSize: 13,
  },
});
