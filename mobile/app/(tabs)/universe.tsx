import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppEmptyState,
  AppErrorState,
  AppLoadingState,
  OfflineBanner,
} from '@/components/states';
import {
  getSessionProfile,
  listMyCircleSummaries,
} from '@/features/local/repository';
import type { CircleSummary, Profile } from '@/types/domain';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
import { toAppError } from '@/lib/errors';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { track, AnalyticsEvents } from '@/lib/logger';

export default function UniverseScreen() {
  const t = useMessages();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);

  const reload = useCallback(async () => {
    setError('');
    setOffline(false);
    try {
      const p = await getSessionProfile();
      if (!p) {
        router.replace('/(auth)/sign-in');
        return;
      }
      setProfile(p);
      setCircles(await listMyCircleSummaries(p.id));
    } catch (e) {
      const app = toAppError(e);
      if (app.code === 'OFFLINE') setOffline(true);
      setError(app.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppLoadingState />
      </SafeAreaView>
    );
  }

  if (!profile) return null;

  const canCreate = isFeatureEnabled('circle_creation_enabled');

  return (
    <SafeAreaView style={styles.safe}>
      <OfflineBanner visible={offline} />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>{t.universe.brand}</Text>
          <Text style={styles.title}>{t.universe.title}</Text>
        </View>
        <Pressable
          style={styles.avatar}
          onPress={() => router.push(`/diary/${profile.id}`)}
          accessibilityRole="button"
          accessibilityLabel={profile.displayName}
        >
          <Text style={styles.avatarText}>{profile.displayName.slice(0, 1)}</Text>
        </Pressable>
      </View>

      {error ? <AppErrorState message={error} onRetry={() => void reload()} /> : null}

      <View style={styles.map}>
        <Pressable
          style={styles.me}
          onPress={() => router.push(`/diary/${profile.id}`)}
          accessibilityRole="button"
          accessibilityLabel={profile.displayName}
        >
          <Text style={styles.meInitial}>{profile.displayName.slice(0, 1)}</Text>
          <Text style={styles.meName}>{profile.displayName}</Text>
        </Pressable>

        {circles.length === 0 && !error ? (
          <AppEmptyState
            title={t.universe.emptyTitle}
            subtitle={t.universe.emptySub}
            actionLabel={canCreate ? t.universe.createCircle : undefined}
            onAction={
              canCreate
                ? () => {
                    router.push('/circles/create');
                  }
                : undefined
            }
            style={{ marginTop: 20 }}
          />
        ) : (
          <View style={styles.circleRow}>
            {circles.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.circle, { backgroundColor: c.color }]}
                onPress={() => {
                  track(AnalyticsEvents.circle_opened, { circle_id: c.id, market: 'US' });
                  router.push(`/circles/${c.id}`);
                }}
                accessibilityRole="button"
                accessibilityLabel={c.name}
              >
                <Text style={styles.symbol}>{c.symbol}</Text>
                <Text style={styles.circleName} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.meta}>{t.universe.wroteToday(c.wroteTodayCount)}</Text>
                {c.hasActiveNotice ? <Text style={styles.meta}>{t.universe.notice}</Text> : null}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {circles.length > 0 && canCreate ? (
        <Pressable
          style={styles.create}
          onPress={() => router.push('/circles/create')}
          accessibilityRole="button"
          accessibilityLabel={t.universe.createCircle}
        >
          <Text style={styles.createText}>{t.universe.createCircle}</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: colors.accent, fontSize: 12 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700' },
  map: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  me: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meInitial: { fontSize: 28, color: colors.ink },
  meName: { marginTop: 4, fontSize: 12, color: colors.muted },
  circleRow: { marginTop: 28, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  symbol: { color: '#fff', fontSize: 18 },
  circleName: { color: '#fff', fontSize: 11, marginTop: 2, maxWidth: 72 },
  meta: { color: 'rgba(255,255,255,0.9)', fontSize: 9 },
  create: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingVertical: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: { color: colors.ink, fontSize: 14 },
});
