import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
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
import { BreathingView } from '@/features/space-ui/BreathingView';
import { EnterFade } from '@/features/space-ui/EnterFade';
import { spaceMotion } from '@/features/space-ui/space-motion';
import type { Circle, Profile } from '@/types/domain';
import { toAppError } from '@/lib/errors';
import { useMessages } from '@/i18n';
import {
  backToUniverseCircles,
  openDiaryFromCircle,
  rememberCircleGraph,
} from '@/features/universe-home/circle-visit';

/** E3 circle room — atmosphere + friend orbs (not a chat list). */
const ROOM = {
  wash: '#17362F',
  washEdge: '#0F241F',
  accent: '#7FAF9A',
  ink: '#E7F2EC',
  muted: 'rgba(231,242,236,0.7)',
  object: 'rgba(231,242,236,0.14)',
  objectBorder: 'rgba(231,242,236,0.28)',
  colors: ['#F0D3B0', '#B8D4E8', '#E8C4D4', '#C9D4B8', '#D4C4E8'] as const,
};

type Friend = { id: string; name: string };

/**
 * Circle graph: one job — choose whose diary to enter.
 * Friends as spatial orbs; notice/board as small corner objects.
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
      if (circleId) rememberCircleGraph(String(circleId));
      void reload();
    }, [circleId, reload]),
  );

  const placements = useMemo(() => {
    const cx = width / 2;
    const cy = height * 0.48;
    const r = Math.min(width, height) * 0.28;
    if (friends.length === 0) return [];
    return friends.map((f, i) => {
      const angle = -Math.PI / 2 + (i / friends.length) * Math.PI * 2 + 0.35;
      const wobble = 0.85 + (i % 3) * 0.08;
      return {
        ...f,
        x: cx + Math.cos(angle) * r * wobble,
        y: cy + Math.sin(angle) * r * wobble * 0.9,
        color: ROOM.colors[i % ROOM.colors.length]!,
      };
    });
  }, [friends, width, height]);

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
          onAction={() => backToUniverseCircles()}
          style={styles.forbidden}
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
      <View style={styles.wash} />
      <View style={styles.header}>
        <Pressable
          onPress={() => backToUniverseCircles()}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Text style={styles.back}>← {t.universe.brand}</Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/circles/${circle.id}`)} hitSlop={12}>
          <Text style={styles.open}>{t.universe.tapPlanet}</Text>
        </Pressable>
      </View>

      <EnterFade>
        <Text style={styles.symbol} accessible={false}>
          {circle.symbol}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {circle.name}
        </Text>
        <Text style={styles.blurb}>
          {friends.length > 0
            ? `${friends.length} quiet orbits`
            : 'invite friends into this room'}
        </Text>
      </EnterFade>

      <View style={styles.stage}>
        <BreathingView active amplitude={1.02} style={styles.ringWrap}>
          <View style={styles.ring} pointerEvents="none" />
        </BreathingView>
        {placements.map((n, i) => (
          <EnterFade
            key={n.id}
            delayMs={120 + i * spaceMotion.roomStaggerMs}
            style={[styles.friendWrap, { left: n.x - 40, top: n.y - 40 }]}
          >
            <Pressable
              onPress={() => openDiaryFromCircle(n.id, circle.id)}
              accessibilityRole="button"
              accessibilityLabel={`Visit ${n.name} diary`}
              style={styles.friendHit}
            >
              <View style={[styles.friendOrb, { backgroundColor: n.color }]}>
                <Text style={styles.friendLetter}>{n.name.slice(0, 1)}</Text>
              </View>
              <Text style={styles.friendName} numberOfLines={1}>
                {n.name}
              </Text>
            </Pressable>
          </EnterFade>
        ))}
        {friends.length === 0 ? (
          <Text style={styles.empty}>No friends in this circle yet</Text>
        ) : null}
      </View>

      <EnterFade delayMs={220} style={styles.objects}>
        <Pressable
          style={styles.obj}
          onPress={() => router.push(`/circles/${circle.id}`)}
          accessibilityRole="button"
          accessibilityLabel="Circle notice"
        >
          <View style={styles.objGlyph} accessible={false}>
            <View style={styles.objGlyphPin} />
          </View>
          <View style={styles.objCopy}>
            <Text style={styles.objLabel}>notice</Text>
            <Text style={styles.objValue} numberOfLines={1}>
              circle board
            </Text>
          </View>
        </Pressable>
        <Pressable
          style={styles.obj}
          onPress={() => router.push(`/circles/${circle.id}/anonymous-board`)}
          accessibilityRole="button"
          accessibilityLabel="Alias board"
        >
          <View style={styles.objGlyph} accessible={false}>
            <View style={styles.objGlyphPage} />
          </View>
          <View style={styles.objCopy}>
            <Text style={styles.objLabel}>board</Text>
            <Text style={styles.objValue} numberOfLines={1}>
              alias board
            </Text>
          </View>
        </Pressable>
      </EnterFade>

      {friends[0] ? (
        <EnterFade delayMs={280}>
          <Pressable
            style={styles.cta}
            onPress={() => openDiaryFromCircle(friends[0]!.id, circle.id)}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>step into a friend’s today →</Text>
          </Pressable>
        </EnterFade>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ROOM.washEdge },
  forbidden: { backgroundColor: ROOM.washEdge },
  wash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: ROOM.wash,
    opacity: 0.95,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  back: { color: ROOM.muted, fontSize: 13, fontWeight: '600', minHeight: 44, textAlignVertical: 'center' },
  open: { color: ROOM.muted, fontSize: 12, fontWeight: '600', minHeight: 44, textAlignVertical: 'center' },
  symbol: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 28,
    color: ROOM.accent,
    zIndex: 2,
  },
  title: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '600',
    color: ROOM.ink,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  blurb: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 14,
    color: ROOM.muted,
    zIndex: 2,
  },
  stage: { flex: 1, minHeight: 280, marginTop: 8 },
  ringWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: '64%',
    height: '56%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ROOM.accent,
    opacity: 0.35,
  },
  friendWrap: {
    position: 'absolute',
    width: 80,
    zIndex: 4,
  },
  friendHit: { alignItems: 'center', width: 80 },
  friendOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendLetter: { fontSize: 20, fontWeight: '700', color: '#2A2430' },
  friendName: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: ROOM.ink,
    maxWidth: 80,
    textAlign: 'center',
  },
  empty: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '45%',
    textAlign: 'center',
    color: ROOM.muted,
    fontSize: 13,
  },
  objects: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
    zIndex: 2,
  },
  obj: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ROOM.objectBorder,
    backgroundColor: ROOM.object,
    padding: 12,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  objGlyph: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  objGlyphPin: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ROOM.accent,
    opacity: 0.85,
  },
  objGlyphPage: {
    width: 16,
    height: 20,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: ROOM.accent,
    opacity: 0.85,
  },
  objCopy: { flex: 1, minWidth: 0 },
  objLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: ROOM.muted,
  },
  objValue: { marginTop: 4, fontSize: 13, fontWeight: '500', color: ROOM.ink },
  cta: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    zIndex: 2,
  },
  ctaText: { color: ROOM.ink, fontSize: 14, fontWeight: '500' },
});
