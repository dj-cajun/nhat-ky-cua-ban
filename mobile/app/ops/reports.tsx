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
 * Reports ops console — gated by app_moderators / local operatorUserIds.
 */
export default function OpsReportsScreen() {
  const t = useMessages();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<
    {
      id: string;
      targetType: string;
      targetId: string;
      reason: string;
      status: string;
      createdAt: string;
    }[]
  >([]);
  const [adminId, setAdminId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const me = await getSessionProfile();
      if (!me) {
        router.replace('/(auth)/sign-in');
        return;
      }
      setAdminId(me.id);
      const caps = await opsService.getCapabilities(me.id);
      if (!caps.isModerator) {
        setForbidden(true);
        return;
      }
      setForbidden(false);
      const list = await opsService.listReports({
        adminId: me.id,
        isModerator: true,
      });
      setRows(
        list.map((r) => ({
          id: r.id,
          targetType: r.targetType,
          targetId: r.targetId,
          reason: r.reason,
          status: r.status,
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

  const hide = async (targetType: string, targetId: string) => {
    if (!adminId) return;
    try {
      const caps = await opsService.getCapabilities(adminId);
      if (!caps.isModerator) {
        setForbidden(true);
        return;
      }
      await opsService.hideContent({
        adminId,
        isModerator: true,
        targetType,
        targetId,
        reason: 'ops_hide',
      });
      await reload();
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  if (forbidden) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppForbiddenState
          actionLabel={t.circle.toUniverse}
          onAction={() => router.replace('/(tabs)/universe')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.back}>{t.ops.back}</Text>
      </Pressable>
      <Text style={styles.title}>{t.ops.title}</Text>
      <Text style={styles.sub}>{t.ops.sub}</Text>

      {loading ? <AppLoadingState /> : null}
      {error ? <AppErrorState message={error} onRetry={() => void reload()} /> : null}
      {!loading && !error && rows.length === 0 ? (
        <AppEmptyState title={t.ops.empty} />
      ) : null}

      <ScrollView>
        {rows.map((r) => (
          <View key={r.id} style={styles.card}>
            <Text style={styles.meta}>
              {r.targetType} · {r.status}
            </Text>
            <Text style={styles.reason}>{r.reason}</Text>
            <Text style={styles.time}>{r.createdAt}</Text>
            <Pressable
              style={styles.action}
              onPress={() => void hide(r.targetType, r.targetId)}
              accessibilityRole="button"
              accessibilityLabel={t.ops.hideContent}
            >
              <Text style={styles.actionText}>{t.ops.hideContent}</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 6, color: colors.muted, marginBottom: 12 },
  card: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  meta: { fontSize: 12, color: colors.accent },
  reason: { marginTop: 6, color: colors.ink },
  time: { marginTop: 4, fontSize: 11, color: colors.soft },
  action: { marginTop: 10, minHeight: 44, justifyContent: 'center' },
  actionText: { color: colors.warn, fontWeight: '600' },
});
