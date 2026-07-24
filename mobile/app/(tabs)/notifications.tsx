import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppEmptyState,
  AppErrorState,
  AppLoadingState,
} from '@/components/states';
import {
  getSessionProfile,
  listMyJoinRecommendations,
} from '@/features/local/repository';
import { toAppError } from '@/lib/errors';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

export default function NotificationsScreen() {
  const [pendingRecs, setPendingRecs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setError('');
    try {
      const me = await getSessionProfile();
      if (!me) {
        router.replace('/(auth)/sign-in');
        return;
      }
      const list = await listMyJoinRecommendations(me.id);
      setPendingRecs(list.length);
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const goRecommendations = () => {
    router.push('/recommendations');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppLoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>{en.notifications.title}</Text>
      <Text style={styles.sub}>{en.notifications.sub}</Text>

      {error ? <AppErrorState message={error} onRetry={() => void reload()} /> : null}

      <Pressable
        style={styles.link}
        onPress={goRecommendations}
        accessibilityRole="button"
        accessibilityLabel={en.recommendations.title}
      >
        <Text style={styles.linkText}>
          {en.recommendations.title}
          {pendingRecs > 0 ? ` (${pendingRecs})` : ''}
        </Text>
      </Pressable>

      <Pressable
        style={styles.link}
        onPress={() => router.push('/messages')}
        accessibilityRole="button"
        accessibilityLabel={en.messages.title}
      >
        <Text style={styles.linkText}>{en.messages.title}</Text>
      </Pressable>

      <Pressable
        style={styles.link}
        onPress={() => router.push('/circles/create')}
        accessibilityRole="button"
      >
        <Text style={styles.linkText}>{en.universe.createCircle}</Text>
      </Pressable>

      <Pressable
        style={styles.link}
        onPress={() => router.push('/settings/account')}
        accessibilityRole="button"
        accessibilityLabel={en.settings.account}
      >
        <Text style={styles.linkText}>{en.settings.account}</Text>
      </Pressable>

      {pendingRecs === 0 && !error ? (
        <AppEmptyState title={en.notifications.empty} style={{ marginTop: 24 }} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20 },
  link: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: { color: colors.ink },
});
