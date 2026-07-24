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
  useAnimatedStyle,
  useSharedValue,
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

const PASTEL = {
  fill: 'rgba(255, 232, 240, 0.55)',
  border: '#E8A4C4',
  ink: '#8B4F6A',
  edge: 'rgba(90, 60, 80, 0.35)',
  edgeSoft: 'rgba(90, 60, 80, 0.2)',
  friendFills: ['#DFF4FF', '#E5F8E8', '#FFF3E0', '#F0EAFF', '#FFFCE8'] as const,
  friendInks: ['#3F6F96', '#3F7A4E', '#8A6A3A', '#5E4F8A', '#8A7A3A'] as const,
  space: '#FBF6EE',
};

/**
 * New page: friends inside one circle, Obsidian-like links around me (A).
 */
export default function CircleGraphScreen() {
  const t = useMessages();
  const { width, height } = useWindowDimensions();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const [me, setMe] = useState<Profile | null>(null);
  const [circle, setCircle] = useState<Circle | null>(null);
  const [friends, setFriends] = useState<{ id: string; name: string }[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hotId, setHotId] = useState<string | null>(null);

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
      const rows: { id: string; name: string }[] = [];
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

  const cx = width / 2;
  const cy = height * 0.42;
  const diskR = Math.min(width, height) * 0.42;

  const nodes = useMemo(() => {
    const n = Math.max(friends.length, 1);
    const r = diskR * 0.55;
    return friends.map((f, i) => {
      const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
      return {
        ...f,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        fill: PASTEL.friendFills[i % PASTEL.friendFills.length]!,
        ink: PASTEL.friendInks[i % PASTEL.friendInks.length]!,
      };
    });
  }, [friends, cx, cy, diskR]);

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
        {/* Pastel circle field — friends live inside this disk */}
        <View
          pointerEvents="none"
          style={[
            styles.disk,
            {
              left: cx - diskR,
              top: cy - diskR,
              width: diskR * 2,
              height: diskR * 2,
              borderRadius: diskR,
            },
          ]}
        />

        {/* Obsidian edges: me → each friend, friend → next friend */}
        {nodes.map((n) => (
          <EdgeLine key={`e-${n.id}`} x1={cx} y1={cy} x2={n.x} y2={n.y} color={PASTEL.edge} />
        ))}
        {nodes.map((n, i) => {
          if (i >= nodes.length - 1) return null;
          const next = nodes[i + 1]!;
          return (
            <EdgeLine
              key={`ef-${n.id}-${next.id}`}
              x1={n.x}
              y1={n.y}
              x2={next.x}
              y2={next.y}
              color={PASTEL.edgeSoft}
            />
          );
        })}
        {nodes.length > 2 ? (
          <EdgeLine
            x1={nodes[nodes.length - 1]!.x}
            y1={nodes[nodes.length - 1]!.y}
            x2={nodes[0]!.x}
            y2={nodes[0]!.y}
            color={PASTEL.edgeSoft}
          />
        ) : null}

        {nodes.map((n) => (
          <FriendBubble
            key={n.id}
            name={n.name}
            x={n.x}
            y={n.y}
            fill={n.fill}
            ink={n.ink}
            hot={hotId === n.id}
            onHot={(on) => setHotId(on ? n.id : null)}
            onPress={() => router.push(`/diary/${n.id}`)}
          />
        ))}

        {/* A — common center inside the pastel circle */}
        <Pressable
          onPress={() => router.push(`/diary/${me.id}`)}
          style={[styles.self, { left: cx - 36, top: cy - 36 }]}
          accessibilityRole="button"
          accessibilityLabel={me.displayName}
        >
          <Text style={styles.selfLetter}>{me.displayName.slice(0, 1)}</Text>
          <Text style={styles.selfName} numberOfLines={1}>
            {me.displayName}
          </Text>
        </Pressable>

        {friends.length === 0 ? (
          <Text style={[styles.empty, { top: cy + diskR * 0.2 }]}>
            No friends in this circle yet
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function FriendBubble({
  name,
  x,
  y,
  fill,
  ink,
  hot,
  onHot,
  onPress,
}: {
  name: string;
  x: number;
  y: number;
  fill: string;
  ink: string;
  hot: boolean;
  onHot: (on: boolean) => void;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withTiming(hot ? 1.35 : 1, {
      duration: hot ? 140 : 200,
      easing: Easing.out(Easing.cubic),
    });
  }, [hot, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ position: 'absolute', left: x - 30, top: y - 30, zIndex: 5 }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => onHot(true)}
        onPressOut={() => onHot(false)}
        onHoverIn={() => onHot(true)}
        onHoverOut={() => onHot(false)}
        style={[styles.friend, { backgroundColor: fill }]}
        accessibilityRole="button"
        accessibilityLabel={name}
      >
        <Text style={[styles.friendLetter, { color: ink }]}>{name.slice(0, 1)}</Text>
        <Text style={[styles.friendName, { color: ink }]} numberOfLines={1}>
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
        zIndex: 2,
      }}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PASTEL.space },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  back: { color: PASTEL.ink, fontSize: 13, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#2A2430', fontSize: 15, fontWeight: '700' },
  open: { color: PASTEL.ink, fontSize: 12, fontWeight: '600' },
  stage: { flex: 1 },
  disk: {
    position: 'absolute',
    backgroundColor: PASTEL.fill,
    borderWidth: 2,
    borderColor: PASTEL.border,
  },
  self: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0C36A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  selfLetter: { color: '#fff', fontWeight: '800', fontSize: 18 },
  selfName: { color: '#2A2430', fontSize: 10, fontWeight: '700', marginTop: 2, maxWidth: 64 },
  friend: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 4,
  },
  friendLetter: { fontWeight: '800', fontSize: 14 },
  friendName: { fontSize: 9, fontWeight: '600', marginTop: 2, maxWidth: 52, textAlign: 'center' },
  empty: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: PASTEL.ink,
    opacity: 0.7,
    fontSize: 13,
  },
});
