import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getActivePost,
  getCircle,
  getProfile,
  getSessionProfile,
  isCircleMember,
  listCircleMembers,
  listRespondedUserIds,
} from '@/features/local/repository';
import { useCirclePresence } from '@/features/presence/use-circle-presence';
import type { Circle, Profile } from '@/types/domain';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

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
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());

  const { isPresent, connection } = useCirclePresence({
    circleId,
    userId: meId,
    isMember: isMember && !forbidden,
  });

  const reload = useCallback(async () => {
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
    const active = await getActivePost(circleId);
    setActivePostId(active?.id ?? null);
    if (active) {
      setRespondedIds(new Set(await listRespondedUserIds(active.id)));
    } else {
      setRespondedIds(new Set());
    }
  }, [circleId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  if (forbidden) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>{en.circle.forbiddenTitle}</Text>
        <Text style={styles.sub}>{en.circle.forbiddenSub}</Text>
        <Pressable onPress={() => router.replace('/(tabs)/universe')}>
          <Text style={styles.back}>{en.circle.toUniverse}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!circle) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.replace('/(tabs)/universe')}>
        <Text style={styles.back}>{en.circle.backUniverse}</Text>
      </Pressable>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: circle.color }]}>
          <Text style={{ color: '#fff', fontSize: 18 }}>{circle.symbol}</Text>
        </View>
        <View>
          <Text style={styles.title}>{circle.name}</Text>
          <Text style={styles.sub}>
            {en.circle.memberCount(members.length)}
            {activePostId ? ` · ${en.universe.notice}` : ''}
            {connection === 'connected' ? ` · ${en.circle.hereNow}` : ''}
          </Text>
        </View>
      </View>

      <Text style={styles.section}>{en.circle.members}</Text>
      <View style={styles.grid}>
        {members.map((m) => {
          // Phase 5: green = in this circle space (Presence). Orange from DB responses until phase 6.
          const orange = Boolean(activePostId && respondedIds.has(m.userId));
          const green = !orange && isPresent(m.userId);
          return (
            <Pressable
              key={m.userId}
              style={styles.member}
              onPress={() => router.push(`/diary/${m.userId}`)}
            >
              <View style={styles.dot}>
                <Text>{(m.profile?.displayName ?? '?').slice(0, 1)}</Text>
              </View>
              <Text style={styles.memberName} numberOfLines={1}>
                {m.profile?.displayName ?? 'Member'}
              </Text>
              {m.isPioneer ? <Text style={styles.pioneer}>{en.circle.pioneer}</Text> : null}
              <View
                style={[
                  styles.statusDot,
                  orange
                    ? { backgroundColor: colors.orange }
                    : green
                      ? { backgroundColor: colors.green }
                      : { backgroundColor: 'transparent' },
                ]}
                accessibilityLabel={
                  orange ? en.circle.respondedBadge : green ? en.circle.present : undefined
                }
              />
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.link} onPress={() => router.push(`/circles/${circleId}/notice`)}>
        <Text style={styles.linkText}>{en.circle.noticePoll}</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => router.push(`/circles/${circleId}/join`)}>
        <Text style={styles.linkText}>{en.circle.joinInvite}</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => router.push(`/circles/${circleId}/settings`)}>
        <Text style={styles.linkText}>{en.circle.settings}</Text>
      </Pressable>
      <Pressable
        style={styles.link}
        onPress={() => router.push(`/circles/${circleId}/anonymous-board`)}
      >
        <Text style={styles.linkText}>{en.circle.anonymousBoard}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { color: colors.soft, fontSize: 12 },
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
  statusDot: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  link: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: 14,
  },
  linkText: { color: colors.ink, fontSize: 14 },
});
