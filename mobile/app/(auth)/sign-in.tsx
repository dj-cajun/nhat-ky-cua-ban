import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signUpLocal } from '@/features/local/repository';
import { requestIntroReplay, resetUniverseVisitSession } from '@/features/universe-home';
import { toAppError } from '@/lib/errors';
import { track } from '@/lib/logger';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
export default function SignInScreen() {
  const t = useMessages();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.brand}>{t.brand}</Text>
      <Text style={styles.title}>{t.auth.chooseSignIn}</Text>
      <Text style={styles.sub}>{t.tagline}</Text>

      {/* US App Store: Apple first when third-party login is offered */}
      <Pressable
        style={styles.btn}
        onPress={() => setError(t.auth.appleNote)}
      >
        <Text style={styles.btnText}>{t.auth.apple}</Text>
      </Pressable>

      <Pressable
        style={[styles.btn, styles.ghost]}
        onPress={() => setError(t.auth.googleNote)}
      >
        <Text style={styles.ghostText}>{t.auth.google}</Text>
        <Text style={styles.badge}>{t.auth.comingSoon}</Text>
      </Pressable>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="name@email.com"
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
        placeholderTextColor={colors.soft}
      />
      <Pressable
        style={[styles.btn, styles.ghost]}
        onPress={() => {
          if (!email.includes('@')) {
            setError(t.auth.invalidEmail);
            return;
          }
          router.push({ pathname: '/(auth)/onboarding', params: { email } });
        }}
      >
        <Text style={styles.ghostText}>{t.auth.email}</Text>
      </Pressable>

      <Pressable
        style={[styles.btn, styles.demo]}
        onPress={async () => {
          try {
            await signUpLocal('Alex');
            // Local/demo: always land on My Universe with the full intro.
            resetUniverseVisitSession();
            await requestIntroReplay();
            track('circle_creation_started', { via: 'demo_shortcut', market: 'US' });
            router.replace('/(tabs)/universe');
          } catch (e) {
            setError(toAppError(e).message);
          }
        }}
      >
        <Text style={styles.btnText}>{t.auth.demo}</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Link href="/(auth)/sign-up" style={styles.link}>
        {t.auth.noAccount}
      </Link>
      <Text style={styles.market}>United States · English</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 20, backgroundColor: colors.bg },
  brand: { color: colors.accent, fontSize: 12, letterSpacing: 1 },
  title: { marginTop: 8, fontSize: 24, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, marginBottom: 24, color: colors.muted, lineHeight: 20 },
  btn: {
    backgroundColor: colors.ink,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  ghost: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  ghostText: { color: colors.ink, fontSize: 14 },
  badge: { color: colors.soft, fontSize: 11 },
  demo: { marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    color: colors.ink,
  },
  error: { marginTop: 12, color: colors.warn, fontSize: 13 },
  link: { marginTop: 20, color: colors.muted, fontSize: 13 },
  market: { marginTop: 12, fontSize: 11, color: colors.soft },
});
