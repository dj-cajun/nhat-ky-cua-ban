import {
  Fraunces_500Medium_Italic,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
} from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { hompy } from '@/constants/hompy-theme';
import { e2 } from '@/features/e2-prototype/tokens';

/**
 * Phase E2 only — static space prototype.
 * No production data, migrations, or auth changes.
 */
export default function E2PrototypeLayout() {
  const [loaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_500Medium_Italic,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  });

  if (!loaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: e2.space.void,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={e2.brand.wordmark} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: hompy.table },
        }}
      />
    </>
  );
}
