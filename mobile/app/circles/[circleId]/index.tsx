import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getCircle,
  getProfile,
  getSessionProfile,
  isCircleMember,
  listCircleMembers,
} from '@/features/local/repository';
import type { Circle, Profile } from '@/types/domain';
import { colors } from '@/constants/theme';

export default function CircleHomeScreen() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<
    { userId: string; isPioneer: boolean; profile: Profile | null }[]
  >([]);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    void (async () => {
      const me = await getSessionProfile();
      if (!me || !circleId) {
        router.replace('/(auth)/sign-in');
        return;
      }
      if (!(await isCircleMember(circleId, me.id))) {
        setForbidden(true);
        return;
      }
      setCircle(await getCircle(circleId));
      const list = await listCircleMembers(circleId);
      const enriched = await Promise.all(
        list.map(async (m) => ({
          userId: m.userId,
          isPioneer: m.isPioneer,
          profile: await getProfile(m.userId),
        })),
      );
      setMembers(enriched);
    })();
  }, [circleId]);

  if (forbidden) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>접근할 수 없어요</Text>
        <Text style={styles.sub}>서클 멤버만 볼 수 있습니다.</Text>
        <Pressable onPress={() => router.replace('/(tabs)/universe')}>
          <Text style={styles.back}>← 우주로</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!circle) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.replace('/(tabs)/universe')}>
        <Text style={styles.back}>← 우주</Text>
      </Pressable>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: circle.color }]}>
          <Text style={{ color: '#fff', fontSize: 18 }}>{circle.symbol}</Text>
        </View>
        <View>
          <Text style={styles.title}>{circle.name}</Text>
          <Text style={styles.sub}>멤버 {members.length}</Text>
        </View>
      </View>

      <Text style={styles.section}>멤버</Text>
      <View style={styles.grid}>
        {members.map((m) => (
          <Pressable
            key={m.userId}
            style={styles.member}
            onPress={() => router.push(`/diary/${m.userId}`)}
          >
            <View style={styles.dot}>
              <Text>{(m.profile?.displayName ?? '?').slice(0, 1)}</Text>
            </View>
            <Text style={styles.memberName} numberOfLines={1}>
              {m.profile?.displayName ?? '멤버'}
            </Text>
            {m.isPioneer ? <Text style={styles.pioneer}>개척자</Text> : null}
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.link} onPress={() => router.push(`/circles/${circleId}/settings`)}>
        <Text style={styles.linkText}>서클 설정</Text>
      </Pressable>
      <Pressable style={styles.link} onPress={() => router.push(`/circles/${circleId}/notice`)}>
        <Text style={styles.linkText}>공지·투표</Text>
      </Pressable>
      <Pressable
        style={styles.link}
        onPress={() => router.push(`/circles/${circleId}/anonymous-board`)}
      >
        <Text style={styles.linkText}>가명 게시판</Text>
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
