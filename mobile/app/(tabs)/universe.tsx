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
  getMySchoolMembership,
  getProfile,
  getSessionProfile,
  listCircleMembers,
  listMyCircleSummaries,
} from '@/features/local/repository';
import type { SchoolMembershipStatus } from '@/features/local/school';
import { UniverseHome } from '@/features/universe-home';
import type { UniverseGraphFriend } from '@/features/universe-home/fallback-universe';
import { INTRO_HANDOFF } from '@/features/universe-home/handoff';
import { openCircleGraph } from '@/features/universe-home/circle-visit';
import type { CircleSummary, Profile } from '@/types/domain';
import { toAppError } from '@/lib/errors';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { track, AnalyticsEvents } from '@/lib/logger';

export default function UniverseScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [friends, setFriends] = useState<UniverseGraphFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);
  const [introPlaying, setIntroPlaying] = useState(true);
  const [schoolStatus, setSchoolStatus] = useState<SchoolMembershipStatus>('none');

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
      const membership = await getMySchoolMembership(p.id);
      setSchoolStatus(membership.status);
      const myCircles = await listMyCircleSummaries(p.id);
      setCircles(myCircles);

      const rows: UniverseGraphFriend[] = [];
      const seen = new Set<string>();
      for (const c of myCircles) {
        try {
          const members = await listCircleMembers(c.id, p.id);
          for (const m of members) {
            if (m.userId === p.id) continue;
            const key = `${c.id}:${m.userId}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const friend = await getProfile(m.userId);
            if (friend) {
              rows.push({
                userId: friend.id,
                displayName: friend.displayName,
                circleId: c.id,
              });
            }
          }
        } catch {
          /* roster forbidden — skip */
        }
      }
      setFriends(rows);
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

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      {!introPlaying ? <OfflineBanner visible={offline} /> : null}
      {error && !introPlaying ? (
        <AppErrorState message={error} onRetry={() => void reload()} />
      ) : null}
      <UniverseHome
        profile={profile}
        circles={circles}
        friends={friends}
        canCreate={canCreate}
        onIntroPlayingChange={setIntroPlaying}
        onPressSelf={() => router.push(`/diary/${profile.id}`)}
        onPressCircle={(id) => {
          track(AnalyticsEvents.circle_opened, { circle_id: id, market: 'US' });
          openCircleGraph(id);
        }}
        onPressFriend={(userId) => {
          track(AnalyticsEvents.diary_viewed, { market: 'US' });
          router.push(`/diary/${userId}`);
        }}
        onCreateCircle={() =>
          router.push(schoolStatus === 'verified' ? '/circles/create' : '/school')
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: INTRO_HANDOFF.spaceBg },
});
