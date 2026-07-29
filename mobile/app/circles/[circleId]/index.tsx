import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppErrorState,
  AppForbiddenState,
  AppLoadingState,
} from '@/components/states';
import {
  getSessionProfile,
  isCircleMember,
} from '@/features/local/repository';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
import { toAppError } from '@/lib/errors';

/**
 * Legacy circle home → orb graph.
 * Core path: universe → /circles/[id]/graph → diary orbs.
 */
export default function CircleHomeScreen() {
  const t = useMessages();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        setError('');
        setForbidden(false);
        setLoading(true);
        try {
          const me = await getSessionProfile();
          if (!me || !circleId) {
            router.replace('/(auth)/sign-in');
            return;
          }
          const member = await isCircleMember(circleId, me.id);
          if (!member) {
            if (!cancelled) {
              setForbidden(true);
              setLoading(false);
            }
            return;
          }
          router.replace(`/circles/${circleId}/graph`);
        } catch (e) {
          if (!cancelled) {
            setError(toAppError(e).message);
            setLoading(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [circleId]),
  );

  if (forbidden) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppForbiddenState
          title={t.circle.forbiddenTitle}
          subtitle={t.circle.forbiddenSub}
          actionLabel={t.circle.toUniverse}
          onAction={() => router.replace('/(tabs)/universe')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {error ? (
        <AppErrorState message={error} onRetry={() => router.replace(`/circles/${circleId}`)} />
      ) : loading ? (
        <AppLoadingState />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
});
