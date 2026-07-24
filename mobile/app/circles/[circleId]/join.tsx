import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createJoinRequest,
  DEMO_JOIN_IDS,
  ensureDemoJoinApplicant,
  getCircleInvitePreview,
  getJoinProgress,
  getSessionProfile,
  listJoinRecommenderCandidates,
} from '@/features/local/repository';
import { switchToUser } from '@/features/session/session-lifecycle';
import { CIRCLE_JOIN_RECOMMENDATION_COUNT, type Profile } from '@/types/domain';
import { toAppError } from '@/lib/errors';
import { track } from '@/lib/logger';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

export default function CircleJoinScreen() {
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const [me, setMe] = useState<Profile | null>(null);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof getCircleInvitePreview>>>(null);
  const [candidates, setCandidates] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    recommended: number;
    total: number;
    status: string;
  } | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    const session = await getSessionProfile();
    if (!session || !circleId) {
      router.replace('/(auth)/sign-in');
      return;
    }
    setMe(session);
    const p = await getCircleInvitePreview(circleId, session.id);
    setPreview(p);
    if (!p) return;
    if (p.isMember) {
      setProgress({ recommended: 3, total: 3, status: 'approved' });
      return;
    }
    try {
      setCandidates(await listJoinRecommenderCandidates(circleId, session.id));
    } catch (e) {
      setError(toAppError(e).message);
    }
    if (requestId) {
      try {
        const prog = await getJoinProgress(requestId, session.id);
        setProgress({
          recommended: prog.recommended,
          total: prog.total,
          status: prog.status,
        });
      } catch {
        /* ignore */
      }
    }
  }, [circleId, requestId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= CIRCLE_JOIN_RECOMMENDATION_COUNT) return prev;
      return [...prev, id];
    });
  };

  const submit = async () => {
    if (!me || !circleId) return;
    setError('');
    try {
      const req = await createJoinRequest(circleId, me.id, selected);
      setRequestId(req.id);
      const prog = await getJoinProgress(req.id, me.id);
      setProgress({
        recommended: prog.recommended,
        total: prog.total,
        status: prog.status,
      });
      track('join_request_created', { market: 'US' });
      router.push(`/join-requests/${req.id}`);
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  const demoAsYujin = async () => {
    await ensureDemoJoinApplicant();
    await switchToUser(DEMO_JOIN_IDS.yujin);
    setSelected([]);
    setRequestId(null);
    setProgress(null);
    await reload();
  };

  if (!preview) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>{en.join.title}</Text>
        <Text style={styles.sub}>{en.errors.unknown}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>{en.join.back}</Text>
        </Pressable>

        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: preview.color }]}>
            <Text style={{ color: '#fff', fontSize: 18 }}>{preview.symbol}</Text>
          </View>
          <View>
            <Text style={styles.title}>{preview.name}</Text>
            <Text style={styles.sub}>
              {preview.memberCount} members
              {preview.description ? ` · ${preview.description}` : ''}
            </Text>
          </View>
        </View>

        <Text style={styles.need}>{en.join.needThree}</Text>
        <Text style={styles.hint}>{en.join.membersHidden}</Text>

        {preview.isMember || progress?.status === 'approved' ? (
          <Pressable style={styles.btn} onPress={() => router.replace(`/circles/${circleId}`)}>
            <Text style={styles.btnText}>{en.join.done}</Text>
          </Pressable>
        ) : (
          <>
            <Text style={styles.label}>{en.join.pickThree(selected.length)}</Text>
            <View style={styles.list}>
              {candidates.map((c) => {
                const on = selected.includes(c.id);
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => toggle(c.id)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={{ color: on ? '#fff' : colors.ink }}>{c.displayName}</Text>
                  </Pressable>
                );
              })}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[
                styles.btn,
                selected.length !== CIRCLE_JOIN_RECOMMENDATION_COUNT && { opacity: 0.4 },
              ]}
              disabled={selected.length !== CIRCLE_JOIN_RECOMMENDATION_COUNT}
              onPress={() => void submit()}
            >
              <Text style={styles.btnText}>{en.join.submit}</Text>
            </Pressable>
          </>
        )}

        <Pressable style={styles.demo} onPress={() => void demoAsYujin()}>
          <Text style={styles.demoText}>{en.join.demoAsYujin}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { color: colors.soft, fontSize: 12, marginTop: 2 },
  need: { color: colors.ink, lineHeight: 22, marginBottom: 8 },
  hint: { color: colors.soft, fontSize: 12, marginBottom: 16 },
  label: { fontSize: 12, color: colors.accent, marginBottom: 10 },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  btn: {
    marginTop: 20,
    backgroundColor: colors.ink,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  error: { marginTop: 12, color: colors.warn },
  demo: { marginTop: 24, alignItems: 'center' },
  demoText: { color: colors.muted, fontSize: 12 },
});
