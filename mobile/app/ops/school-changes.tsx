import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSessionProfile } from '@/features/local/repository';
import { opsService } from '@/features/ops/ops.service';
import {
  AppEmptyState,
  AppErrorState,
  AppForbiddenState,
  AppLoadingState,
} from '@/components/states';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
import { toAppError } from '@/lib/errors';

export default function OpsSchoolChangesScreen() {
  const t = useMessages();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [actorId, setActorId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [rows, setRows] = useState<
    {
      id: string;
      userId: string;
      fromSchoolName?: string;
      toSchoolName: string;
      reason?: string;
      createdAt: string;
    }[]
  >([]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const me = await getSessionProfile();
      if (!me) {
        router.replace('/(auth)/sign-in');
        return;
      }
      setActorId(me.id);
      const caps = await opsService.getCapabilities(me.id);
      if (!caps.isModerator) {
        setForbidden(true);
        return;
      }
      setForbidden(false);
      const list = await opsService.listSchoolChangeRequests(me.id);
      setRows(
        list.map((r) => ({
          id: r.id,
          userId: r.userId,
          fromSchoolName: r.fromSchoolName,
          toSchoolName: r.toSchoolName,
          reason: r.reason,
          createdAt: r.createdAt,
        })),
      );
    } catch (e) {
      const app = toAppError(e);
      if (app.code === 'FORBIDDEN') setForbidden(true);
      else setError(app.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const decide = async (requestId: string, decision: 'approved' | 'rejected') => {
    if (!actorId) return;
    setError('');
    if (!reason.trim()) {
      setError(t.ops.reasonRequired);
      return;
    }
    try {
      await opsService.reviewSchoolChange({
        actorId,
        requestId,
        decision,
        note: reason.trim(),
      });
      setReason('');
      await reload();
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppLoadingState />
      </SafeAreaView>
    );
  }
  if (forbidden) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppForbiddenState />
      </SafeAreaView>
    );
  }
  if (error && rows.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppErrorState message={error} onRetry={() => void reload()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.back}>{t.ops.back}</Text>
      </Pressable>
      <Text style={styles.title}>{t.ops.changesTitle}</Text>
      <Text style={styles.sub}>{t.ops.changesSub}</Text>
      <Text style={styles.label}>{t.ops.reasonLabel}</Text>
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder={t.ops.reasonPlaceholder}
        placeholderTextColor={colors.soft}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {rows.length === 0 ? (
          <AppEmptyState title={t.ops.changesEmpty} />
        ) : (
          rows.map((r) => (
            <View key={r.id} style={styles.card}>
              <Text style={styles.school}>
                {(r.fromSchoolName ?? '—') + ' → ' + r.toSchoolName}
              </Text>
              <Text style={styles.meta}>user {r.userId.slice(0, 8)}</Text>
              {r.reason ? <Text style={styles.note}>{r.reason}</Text> : null}
              <View style={styles.row}>
                <Pressable
                  style={styles.approve}
                  onPress={() => void decide(r.id, 'approved')}
                  accessibilityRole="button"
                >
                  <Text style={styles.approveText}>{t.ops.approve}</Text>
                </Pressable>
                <Pressable
                  style={styles.reject}
                  onPress={() => void decide(r.id, 'rejected')}
                  accessibilityRole="button"
                >
                  <Text style={styles.rejectText}>{t.ops.reject}</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12, minHeight: 44 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 6, marginBottom: 16, color: colors.muted, lineHeight: 20 },
  label: { fontSize: 12, color: colors.soft, letterSpacing: 1, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.ink,
    marginBottom: 12,
  },
  error: { color: colors.warn, marginBottom: 8 },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  school: { color: colors.ink, fontWeight: '600', fontSize: 16 },
  meta: { marginTop: 4, color: colors.muted, fontSize: 12 },
  note: { marginTop: 6, color: colors.ink, fontSize: 13 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  approve: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveText: { color: colors.bg, fontWeight: '600' },
  reject: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectText: { color: colors.warn, fontWeight: '600' },
});
