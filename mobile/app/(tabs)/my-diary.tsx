import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppErrorState, AppLoadingState } from '@/components/states';
import { getSessionProfile } from '@/features/local/repository';
import { colors } from '@/constants/theme';
import { toAppError } from '@/lib/errors';

/**
 * Diary tab → E3 diary space (`/diary/[userId]`).
 * Keeps one shell: intro → universe sphere → same home as this tab.
 */
export default function MyDiaryTab() {
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        setError('');
        try {
          const p = await getSessionProfile();
          if (cancelled) return;
          if (!p) {
            router.replace('/(auth)/sign-in');
            return;
          }
          router.replace(`/diary/${p.id}`);
        } catch (e) {
          if (!cancelled) setError(toAppError(e).message);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe}>
      {error ? (
        <AppErrorState message={error} onRetry={() => router.replace('/(tabs)/my-diary')} />
      ) : (
        <AppLoadingState />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
});
