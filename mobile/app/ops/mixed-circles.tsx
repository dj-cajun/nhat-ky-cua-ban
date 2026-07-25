import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

/**
 * Mixed-school circle ops queue (B.1).
 * Detect → freeze writes → manual resolve. Never auto-rewrites memberships.
 */
export default function OpsMixedCirclesScreen() {
  const t = useMessages();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [actorId, setActorId] = useState<string | null>(null);
  const [rows, setRows] = useState<
    {
      id: string;
      circleName: string;
      canonicalSchoolName: string;
      autoWriteBlocked: boolean;
      foreignCount: number;
      detectedAt: string;
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
      const list = await opsService.listMixedSchoolCircles(me.id);
      setRows(
        list.map((r) => ({
          id: r.id,
          circleName: r.circleName,
          canonicalSchoolName: r.canonicalSchoolName,
          autoWriteBlocked: r.autoWriteBlocked,
          foreignCount: r.memberSnapshot.length,
          detectedAt: r.detectedAt,
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

  const scan = async () => {
    if (!actorId) return;
    try {
      await opsService.scanMixedSchoolCircles(actorId);
      await reload();
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  const resolve = async (incidentId: string) => {
    if (!actorId) return;
    try {
      await opsService.resolveMixedSchoolCircle({
        actorId,
        incidentId,
        note: 'manual_ops_resolve',
      });
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
      <Text style={styles.title}>{t.ops.mixedTitle}</Text>
      <Text style={styles.sub}>{t.ops.mixedSub}</Text>
      <Pressable style={styles.scan} onPress={() => void scan()} accessibilityRole="button">
        <Text style={styles.scanText}>{t.ops.mixedScan}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {rows.length === 0 ? (
          <AppEmptyState title={t.ops.mixedEmpty} />
        ) : (
          rows.map((r) => (
            <View key={r.id} style={styles.card}>
              <Text style={styles.name}>{r.circleName}</Text>
              <Text style={styles.meta}>
                {r.canonicalSchoolName} · foreign {r.foreignCount}
                {r.autoWriteBlocked ? ` · ${t.ops.mixedFrozen}` : ''}
              </Text>
              <Pressable
                style={styles.resolve}
                onPress={() => void resolve(r.id)}
                accessibilityRole="button"
              >
                <Text style={styles.resolveText}>{t.ops.mixedResolve}</Text>
              </Pressable>
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
  sub: { marginTop: 6, marginBottom: 12, color: colors.muted, lineHeight: 20 },
  scan: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: 12,
    minHeight: 44,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanText: { color: colors.ink, fontWeight: '600' },
  error: { color: colors.warn, marginBottom: 8 },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  name: { color: colors.ink, fontWeight: '600', fontSize: 16 },
  meta: { marginTop: 4, color: colors.muted, fontSize: 12 },
  resolve: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolveText: { color: colors.bg, fontWeight: '600' },
});
