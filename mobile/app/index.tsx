import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  getMySchoolMembership,
  getSessionProfile,
  isSchoolAccessReady,
} from '@/features/local/repository';
import { colors } from '@/constants/theme';
import type { Href } from 'expo-router';

/**
 * Cold start gate:
 * signed out → sign-in
 * signed in, school not ready → /school
 * signed in, school ready → universe (intro plays there on first visit)
 */
export default function Index() {
  const [ready, setReady] = useState(false);
  const [href, setHref] = useState<Href>('/(auth)/sign-in');

  useEffect(() => {
    void (async () => {
      const p = await getSessionProfile();
      if (!p) {
        setHref('/(auth)/sign-in');
        setReady(true);
        return;
      }
      try {
        const m = await getMySchoolMembership(p.id);
        setHref(isSchoolAccessReady(m.status) ? '/(tabs)/universe' : '/school');
      } catch {
        setHref('/school');
      }
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return <Redirect href={href} />;
}
