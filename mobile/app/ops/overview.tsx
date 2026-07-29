import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSessionProfile } from '@/features/local/repository';
import { opsService } from '@/features/ops/ops.service';
import {
  AppErrorState,
  AppForbiddenState,
  AppLoadingState,
} from '@/components/states';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
import { toAppError } from '@/lib/errors';

type Metrics = Awaited<ReturnType<typeof opsService.getOverviewMetrics>>;

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

/**
 * Beta ops overview — aggregate health only. Not personal surveillance.
 */
export default function OpsOverviewScreen() {
  const t = useMessages();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const me = await getSessionProfile();
      if (!me) {
        router.replace('/(auth)/sign-in');
        return;
      }
      const caps = await opsService.getCapabilities(me.id);
      if (!caps.isModerator || !caps.allowedActions.includes('overview_read')) {
        setForbidden(true);
        return;
      }
      setForbidden(false);
      setMetrics(await opsService.getOverviewMetrics(me.id));
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
  if (error || !metrics) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppErrorState message={error || t.errors.unknown} onRetry={() => void reload()} />
      </SafeAreaView>
    );
  }

  const links: { href: string; label: string }[] = [
    { href: '/ops/school-verifications', label: t.ops.schoolLink },
    { href: '/ops/school-changes', label: t.ops.schoolChangesLink },
    { href: '/ops/school-codes', label: t.ops.schoolCodesLink },
    { href: '/ops/safety', label: t.ops.safetyLink },
    { href: '/ops/mixed-circles', label: t.ops.mixedLink },
    { href: '/ops/reports', label: t.ops.title },
    { href: '/ops/school-audit', label: t.ops.schoolAuditLink },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>{t.ops.back}</Text>
        </Pressable>
        <Text style={styles.title}>{t.ops.overviewTitle}</Text>
        <Text style={styles.sub}>{t.ops.overviewSub}</Text>

        <Text style={styles.section}>{t.ops.overviewUsers}</Text>
        <View style={styles.grid}>
          <Metric label={t.ops.metricTotalUsers} value={metrics.totalUsers} />
          <Metric label={t.ops.metricActive1d} value={metrics.activeUsers1d} />
          <Metric label={t.ops.metricActive7d} value={metrics.activeUsers7d} />
          <Metric label={t.ops.metricActive30d} value={metrics.activeUsers30d} />
        </View>

        <Text style={styles.section}>{t.ops.overviewSchool}</Text>
        <View style={styles.grid}>
          <Metric label={t.ops.metricVerified} value={metrics.schoolVerified} />
          <Metric label={t.ops.metricPending} value={metrics.schoolPending} />
        </View>

        <Text style={styles.section}>{t.ops.overviewCircles}</Text>
        <View style={styles.grid}>
          <Metric label={t.ops.metricCirclesOpen} value={metrics.circlesOpened} />
          <Metric label={t.ops.metricCirclesActive} value={metrics.circlesActive7d} />
        </View>

        <Text style={styles.section}>{t.ops.overviewDiary}</Text>
        <View style={styles.grid}>
          <Metric label={t.ops.metricDiaryToday} value={metrics.diaryEntriesToday} />
          <Metric label={t.ops.metricVisitsToday} value={metrics.friendDiaryVisitsToday} />
        </View>

        <Text style={styles.section}>{t.ops.overviewSafety}</Text>
        <View style={styles.grid}>
          <Metric label={t.ops.metricOpenReports} value={metrics.openReports} />
          <Metric label={t.ops.metricMixed} value={metrics.openMixedIncidents} />
        </View>

        <Text style={styles.hint}>{t.ops.overviewHint}</Text>

        <Text style={styles.section}>{t.ops.overviewQueues}</Text>
        {links.map((l) => (
          <Pressable
            key={l.href}
            style={styles.link}
            onPress={() => router.push(l.href as never)}
            accessibilityRole="button"
          >
            <Text style={styles.linkText}>{l.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12, minHeight: 44 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 6, marginBottom: 16, color: colors.muted, lineHeight: 20 },
  section: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.soft,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: {
    width: '47%',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    minHeight: 72,
  },
  metricValue: { fontSize: 22, fontWeight: '600', color: colors.ink },
  metricLabel: { marginTop: 4, fontSize: 12, color: colors.muted, lineHeight: 16 },
  hint: { marginTop: 14, color: colors.soft, fontSize: 12, lineHeight: 18 },
  link: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: { color: colors.ink, fontWeight: '600' },
});
