import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signUpLocal } from '@/features/local/repository';
import { toAppError } from '@/lib/errors';
import { AnalyticsEvents, track } from '@/lib/logger';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
export default function OnboardingScreen() {
  const t = useMessages();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [displayName, setDisplayName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');

  const finish = async () => {
    if (!agreed) {
      setError(t.onboarding.termsRequired);
      return;
    }
    if (!displayName.trim()) {
      setError(t.onboarding.nameRequired);
      return;
    }
    try {
      await signUpLocal(displayName.trim());
      track(AnalyticsEvents.onboarding_completed, {
        market: 'US',
        has_email: Boolean(email),
      });
      router.replace('/(tabs)/universe');
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>{t.onboarding.title}</Text>
      <Text style={styles.sub}>{t.onboarding.sub}</Text>

      <Text style={styles.label}>{t.onboarding.displayName}</Text>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={24}
        style={styles.input}
        placeholder={t.onboarding.placeholder}
        placeholderTextColor={colors.soft}
      />

      <View style={styles.row}>
        <Switch value={agreed} onValueChange={setAgreed} />
        <Text style={styles.terms}>{t.onboarding.terms}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.btn} onPress={() => void finish()}>
        <Text style={styles.btnText}>{t.onboarding.createDiary}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 20, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, marginBottom: 24, color: colors.muted, lineHeight: 20 },
  label: { fontSize: 12, color: colors.soft, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.ink,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  terms: { flex: 1, color: colors.ink, fontSize: 13 },
  error: { marginTop: 12, color: colors.warn },
  btn: {
    marginTop: 24,
    backgroundColor: colors.ink,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
});
