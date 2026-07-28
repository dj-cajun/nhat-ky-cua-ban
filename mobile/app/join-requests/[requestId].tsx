import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  cancelJoinRequest,
  getJoinProgress,
  getSessionProfile,
  isCircleMember,
} from '@/features/local/repository';
import { toAppError } from '@/lib/errors';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
export default function JoinRequestStatusScreen() {
  const t = useMessages();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const [progress, setProgress] = useState<Awaited<ReturnType<typeof getJoinProgress>> | null>(
    null,
  );
  const [error, setError] = useState('');
  const [member, setMember] = useState(false);

  const reload = useCallback(async () => {
    const me = await getSessionProfile();
    if (!me || !requestId) {
      router.replace('/(auth)/sign-in');
      return;
    }
    try {
      const prog = await getJoinProgress(requestId, me.id);
      setProgress(prog);
      setMember(await isCircleMember(prog.circleId, me.id));
    } catch (e) {
      setError(toAppError(e).message);
    }
  }, [requestId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const cancel = async () => {
    const me = await getSessionProfile();
    if (!me || !requestId) return;
    try {
      await cancelJoinRequest(requestId, me.id);
      await reload();
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  if (!progress) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>{t.join.title}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </SafeAreaView>
    );
  }

  const statusLabel =
    progress.status === 'approved' || member
      ? t.join.done
      : progress.status === 'cancelled'
        ? t.join.cancelled
        : progress.status === 'expired'
          ? t.join.expired
          : t.join.progress(progress.recommended, progress.total);

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.replace('/(tabs)/universe')}>
        <Text style={styles.back}>{t.join.back}</Text>
      </Pressable>
      <Text style={styles.title}>{statusLabel}</Text>
      {progress.status === 'pending' ? (
        <Text style={styles.sub}>
          {t.join.progressDetail(progress.recommended, progress.total)}
        </Text>
      ) : null}
      {/* Never show who recommended / who said unknown */}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.link} onPress={() => void reload()}>
        <Text>{t.join.refresh}</Text>
      </Pressable>

      {progress.status === 'pending' ? (
        <Pressable style={styles.link} onPress={() => void cancel()}>
          <Text style={{ color: colors.warn }}>{t.join.cancel}</Text>
        </Pressable>
      ) : null}

      {(progress.status === 'approved' || member) && (
        <Pressable
          style={styles.btn}
          onPress={() => router.replace(`/circles/${progress.circleId}/graph`)}
        >
          <Text style={styles.btnText}>{t.join.done}</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 10, color: colors.muted, lineHeight: 20 },
  link: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: 14,
  },
  btn: {
    marginTop: 20,
    backgroundColor: colors.ink,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  error: { marginTop: 12, color: colors.warn },
});
