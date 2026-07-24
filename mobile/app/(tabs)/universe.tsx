import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppErrorState,
  AppLoadingState,
  OfflineBanner,
} from '@/components/states';
import {
  getSessionProfile,
  listMyCircleSummaries,
} from '@/features/local/repository';
import { UniverseHome } from '@/features/universe-home';
import { INTRO_HANDOFF } from '@/features/universe-home/handoff';
import type { CircleSummary, Profile } from '@/types/domain';
import { toAppError } from '@/lib/errors';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { track, AnalyticsEvents } from '@/lib/logger';

export default function UniverseScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const [introPlaying, setIntroPlaying] = useState(true);

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

  useLayoutEffect(() => {
    navigation.setOptions({
      tabBarStyle: introPlaying
        ? { display: 'none' }
        : {
            backgroundColor: '#F7F4EF',
            borderTopColor: '#E6E0D6',
          },
    });
  }, [navigation, introPlaying]);

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppLoadingState />
      </SafeAreaView>
    );
  }

  if (!profile) return null;

  const canCreate = isFeatureEnabled('circle_creation_enabled');

  // No SafeArea padding around the scene — intro video + 3D/2D spheres share
  // the full window. Chrome inside UniverseHome applies insets itself.
  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      {!introPlaying ? <OfflineBanner visible={offline} /> : null}
      {error && !introPlaying ? (
        <AppErrorState message={error} onRetry={() => void reload()} />
      ) : null}
      <UniverseHome
        profile={profile}
        circles={circles}
        canCreate={canCreate}
        onIntroPlayingChange={setIntroPlaying}
        onPressSelf={() => router.push(`/diary/${profile.id}`)}
        onPressCircle={(id) => {
          track(AnalyticsEvents.circle_opened, { circle_id: id, market: 'US' });
          router.push(`/circles/${id}`);
        }}
        onCreateCircle={() => router.push('/circles/create')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: INTRO_HANDOFF.spaceBg },
});
