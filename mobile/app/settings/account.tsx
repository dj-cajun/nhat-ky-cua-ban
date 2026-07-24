import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLoadingState } from '@/components/states';
import { getSessionProfile } from '@/features/local/repository';
import type { Profile } from '@/types/domain';
import { signOut } from '@/features/session/session-lifecycle';
import { getFeatureFlags, setFeatureFlag, type FeatureFlagName } from '@/lib/feature-flags';
import { toAppError } from '@/lib/errors';
import { colors } from '@/constants/theme';
import { useLocale, useMessages, type Locale } from '@/i18n';

const FLAG_LABELS: { key: FeatureFlagName; label: string }[] = [
  { key: 'anonymous_board_enabled', label: 'Alias board' },
  { key: 'alias_messages_enabled', label: 'Alias notes' },
  { key: 'spotify_search_enabled', label: 'Spotify search' },
  { key: 'realtime_badges_enabled', label: 'Live badges' },
  { key: 'circle_creation_enabled', label: 'Circle creation' },
];

function LanguageSwitcher() {
  const [locale, setLocale] = useLocale();
  const t = useMessages();
  const options: { id: Locale; label: string }[] = [
    { id: 'en', label: t.language.en },
    { id: 'ko', label: t.language.ko },
  ];

  return (
    <View style={styles.langRow} accessibilityRole="radiogroup" accessibilityLabel={t.language.label}>
      <Text style={styles.langLabel}>{t.language.label}</Text>
      <View style={styles.langBtns}>
        {options.map((opt) => {
          const active = locale === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={[styles.langBtn, active && styles.langBtnActive]}
              onPress={() => setLocale(opt.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={opt.label}
            >
              <Text style={[styles.langBtnText, active && styles.langBtnTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function AccountSettingsScreen() {
  const t = useMessages();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [flags, setFlags] = useState(getFeatureFlags());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const me = await getSessionProfile();
        if (!me) {
          router.replace('/(auth)/sign-in');
          return;
        }
        setProfile(me);
        setFlags(getFeatureFlags());
      })();
    }, []),
  );

  const toggle = async (key: FeatureFlagName) => {
    const next = await setFeatureFlag(key, !flags[key]);
    setFlags(next);
  };

  const onSignOut = async () => {
    setBusy(true);
    setError('');
    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppLoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.back}>{t.settings.back}</Text>
      </Pressable>
      <Text style={styles.title}>{t.settings.account}</Text>
      <Text style={styles.sub}>{profile.displayName}</Text>

      <LanguageSwitcher />

      <Pressable
        style={styles.link}
        onPress={() => router.push('/settings/blocked-users')}
        accessibilityRole="button"
      >
        <Text style={styles.linkText}>{t.settings.blockedUsers}</Text>
      </Pressable>

      <Pressable
        style={styles.link}
        onPress={() => router.push('/ops/reports')}
        accessibilityRole="button"
      >
        <Text style={styles.linkText}>{t.ops.title}</Text>
      </Pressable>

      <Text style={styles.section}>{t.settings.featureFlags}</Text>
      <Text style={styles.hint}>{t.settings.featureFlagsHint}</Text>
      {FLAG_LABELS.map((f) => (
        <Pressable
          key={f.key}
          style={styles.flagRow}
          onPress={() => void toggle(f.key)}
          accessibilityRole="switch"
          accessibilityState={{ checked: flags[f.key] }}
          accessibilityLabel={f.label}
        >
          <Text style={styles.linkText}>{f.label}</Text>
          <Text style={styles.flagState}>{flags[f.key] ? 'ON' : 'OFF'}</Text>
        </Pressable>
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.signOut, busy && { opacity: 0.6 }]}
        onPress={() => void onSignOut()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t.settings.signOut}
      >
        <Text style={styles.signOutText}>{t.settings.signOut}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12, minHeight: 44 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 6, color: colors.muted, marginBottom: 16 },
  langRow: { marginBottom: 8 },
  langLabel: { fontSize: 12, color: colors.soft, letterSpacing: 1, marginBottom: 8 },
  langBtns: { flexDirection: 'row', gap: 8 },
  langBtn: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  langBtnActive: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  langBtnText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  langBtnTextActive: { color: colors.bg },
  section: { marginTop: 20, fontSize: 12, color: colors.soft, letterSpacing: 1 },
  hint: { marginTop: 4, marginBottom: 8, fontSize: 12, color: colors.muted },
  link: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: { color: colors.ink, fontSize: 14 },
  flagRow: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: 14,
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flagState: { color: colors.accent, fontWeight: '700', fontSize: 12 },
  signOut: {
    marginTop: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.warn,
    padding: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { color: colors.warn, fontWeight: '600' },
  error: { marginTop: 12, color: colors.warn },
});
