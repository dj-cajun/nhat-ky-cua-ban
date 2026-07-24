import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppEmptyState,
  AppErrorState,
  AppForbiddenState,
  AppLoadingState,
} from '@/components/states';
import { MemberPresenceBadge } from '@/components/ui/member-presence-badge';
import { getAnonymousCirclePreview } from '@/features/anonymous-board/anonymous-board.service';
import type { AnonymousPostItem } from '@/features/anonymous-board/anonymous-board.types';
import {
  getActivePost,
  getCircle,
  getProfile,
  getSessionProfile,
  isBlockedBetween,
  isCircleMember,
  listCircleMembers,
} from '@/features/local/repository';
import { useCirclePresence } from '@/features/presence/use-circle-presence';
import type { Circle, Profile } from '@/types/domain';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';
import { toAppError } from '@/lib/errors';
import { isFeatureEnabled } from '@/lib/feature-flags';

export default function CircleHomeScreen() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const [meId, setMeId] = useState<string | null>(null);
  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<
    { userId: string; isPioneer: boolean; profile: Profile | null }[]
  >([]);
  const [forbidden, setForbidden] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [aliasPreview, setAliasPreview] = useState<AnonymousPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { badgeFor, connection, setBlockedIds } = useCirclePresence({
    circleId,
    userId: meId,
    isMember: isMember && !forbidden,
    activePostId,
  });

  const badgesLive =
    isFeatureEnabled('realtime_badges_enabled') &&
    (connection === 'connected' || connection === 'connecting');

  const reload = useCallback(async () => {
    setError('');
    try {
      const me = await getSessionProfile();
      if (!me || !circleId) {
        router.replace('/(auth)/sign-in');
        return;
      }
      const member = await isCircleMember(circleId, me.id);
      if (!member) {
        setForbidden(true);
        setIsMember(false);
        return;
      }
      setForbidden(false);
      setIsMember(true);
      setMeId(me.id);
      setCircle(await getCircle(circleId));
      const list = await listCircleMembers(circleId, me.id);
      const enriched = await Promise.all(
        list.map(async (m) => ({
          userId: m.userId,
          isPioneer: m.isPioneer,
          profile: await getProfile(m.userId),
        })),
      );
      setMembers(enriched);
      const blocked: string[] = [];
      for (const m of list) {
        if (m.userId === me.id) continue;
        if (await isBlockedBetween(me.id, m.userId)) blocked.push(m.userId);
      }
      setBlockedIds(blocked);
      const active = await getActivePost(circleId);
      setActivePostId(active?.id ?? null);
      if (isFeatureEnabled('anonymous_board_enabled')) {
        try {
          const preview = await getAnonymousCirclePreview(circleId, me.id);
          setAliasPreview(preview.items.slice(0, 3));
        } catch {
          setAliasPreview([]);
        }
      } else {
        setAliasPreview([]);
      }
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setLoading(false);
    }
  }, [circleId, setBlockedIds]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  if (forbidden) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppForbiddenState
          title={en.circle.forbiddenTitle}
          subtitle={en.circle.forbiddenSub}
          actionLabel={en.circle.toUniverse}
          onAction={() => router.replace('/(tabs)/universe')}
        />
      </SafeAreaView>
    );
  }

  if (loading && !circle) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppLoadingState />
      </SafeAreaView>
    );
  }

  if (!circle) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppErrorState
          code="NOT_FOUND"
          onRetry={() => void reload()}
        />
      </SafeAreaView>
    );
  }

  const connectionDegraded =
    connection === 'error' ||
    connection === 'reconnecting' ||
    connection === 'forbidden' ||
    !isFeatureEnabled('realtime_badges_enabled');

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable
        onPress={() => router.replace('/(tabs)/universe')}
        accessibilityRole="button"
        accessibilityLabel={en.circle.backUniverse}
      >
        <Text style={styles.back}>{en.circle.backUniverse}</Text>
      </Pressable>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: circle.color }]}>
          <Text style={{ color: '#fff', fontSize: 18 }}>{circle.symbol}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{circle.name}</Text>
          <Text style={styles.sub}>
            {en.circle.memberCount(members.length)}
            {activePostId ? ` · ${en.universe.notice}` : ''}
            {connection === 'connected' ? ` · ${en.circle.hereNow}` : ''}
          </Text>
          {connectionDegraded ? (
            <Text style={styles.degraded}>{en.circle.realtimeDegraded}</Text>
          ) : null}
        </View>
      </View>

      {error ? <AppErrorState message={error} onRetry={() => void reload()} /> : null}

      <Text style={styles.section}>{en.circle.members}</Text>
      <View style={styles.grid}>
        {members.map((m) => {
          const badge = badgeFor(m.userId);
          const name = m.profile?.displayName ?? 'Member';
          return (
            <Pressable
              key={m.userId}
              style={styles.member}
              onPress={() => router.push(`/diary/${m.userId}`)}
              accessibilityRole="button"
              accessibilityLabel={name}
            >
              <View style={styles.dot}>
                <Text>{name.slice(0, 1)}</Text>
              </View>
              <Text style={styles.memberName} numberOfLines={1}>
                {name}
              </Text>
              {m.isPioneer ? <Text style={styles.pioneer}>{en.circle.pioneer}</Text> : null}
              <View style={styles.badgeSlot}>
                <MemberPresenceBadge
                  badge={badge}
                  displayName={name}
                  connectionOk={badgesLive && connection === 'connected'}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={styles.link}
        onPress={() => router.push(`/circles/${circleId}/notice`)}
        accessibilityRole="button"
        accessibilityLabel={en.circle.noticePoll}
      >
        <Text style={styles.linkText}>{en.circle.noticePoll}</Text>
      </Pressable>

      <Text style={[styles.section, { marginTop: 18 }]}>{en.circle.anonymousBoard}</Text>
      {!isFeatureEnabled('anonymous_board_enabled') ? (
        <Text style={styles.previewEmpty}>{en.circle.featureDisabled}</Text>
      ) : aliasPreview.length === 0 ? (
        <AppEmptyState title={en.aliasBoard.empty} subtitle={en.aliasBoard.emptySub} />
      ) : (
        <View style={styles.previewList}>
          {aliasPreview.map((p) => (
            <View key={p.id} style={styles.previewItem}>
              <Text style={styles.previewAlias}>{p.aliasName}</Text>
              <Text style={styles.previewBody} numberOfLines={2}>
                {p.body}
              </Text>
            </View>
          ))}
        </View>
      )}
      {isFeatureEnabled('anonymous_board_enabled') ? (
        <Pressable
          style={styles.link}
          onPress={() => router.push(`/circles/${circleId}/anonymous-board`)}
          accessibilityRole="button"
          accessibilityLabel={en.circle.aliasViewBoard}
        >
          <Text style={styles.linkText}>{en.circle.aliasViewBoard}</Text>
        </Pressable>
      ) : null}

      <Pressable
        style={styles.link}
        onPress={() => router.push(`/circles/${circleId}/join`)}
        accessibilityRole="button"
      >
        <Text style={styles.linkText}>{en.circle.joinInvite}</Text>
      </Pressable>
      <Pressable
        style={styles.link}
        onPress={() => router.push(`/circles/${circleId}/settings`)}
        accessibilityRole="button"
      >
        <Text style={styles.linkText}>{en.circle.settings}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12, minHeight: 44, textAlignVertical: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { color: colors.soft, fontSize: 12 },
  degraded: { marginTop: 4, color: colors.muted, fontSize: 11 },
  section: { fontSize: 11, color: colors.soft, marginBottom: 10, letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  member: {
    width: '30%',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    alignItems: 'center',
  },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFE8DE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: { marginTop: 6, fontSize: 12, color: colors.ink },
  pioneer: { marginTop: 2, fontSize: 9, color: colors.accent },
  badgeSlot: { position: 'absolute', right: 6, top: 6 },
  link: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: { color: colors.ink, fontSize: 14 },
  previewEmpty: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  previewList: { gap: 8 },
  previewItem: {
    borderLeftWidth: 2,
    borderLeftColor: colors.line,
    paddingLeft: 10,
    paddingVertical: 4,
  },
  previewAlias: { fontSize: 12, fontWeight: '600', color: colors.ink },
  previewBody: { marginTop: 2, fontSize: 13, color: colors.muted, lineHeight: 18 },
});
