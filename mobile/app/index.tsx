import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getSessionProfile } from '@/features/local/repository';
import { colors } from '@/constants/theme';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    void getSessionProfile().then((p) => {
      setSignedIn(Boolean(p));
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return <Redirect href={signedIn ? '/(tabs)/universe' : '/(auth)/sign-in'} />;
}
