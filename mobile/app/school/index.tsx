import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLoadingState } from '@/components/states';
import {
  getMySchoolMembership,
  getSessionProfile,
  submitSchoolInviteCode,
} from '@/features/local/repository';
import type { SchoolMembershipStatus } from '@/features/local/school';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
import { toAppError } from '@/lib/errors';

/**
 * Phase B minimal school surface: code entry + membership status.
 * No school directory, student search, or school home.
 */
export default function SchoolStatusScreen() {
  const t = useMessages();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SchoolMembershipStatus>('none');
  const [schoolName, setSchoolName] = useState<string | undefined>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const me = await getSessionProfile();
      if (!me) {
        router.replace('/(auth)/sign-in');
        return;
      }
      setUserId(me.id);
      const m = await getMySchoolMembership(me.id);
      setStatus(m.status);
      setSchoolName(m.schoolName);
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const onSubmit = async () => {
    if (!userId) return;
    setBusy(true);
    setError('');
    try {
      await submitSchoolInviteCode(userId, code);
      setCode('');
      await reload();
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppLoadingState />
      </SafeAreaView>
    );
  }

  const statusCopy: Record<SchoolMembershipStatus, string> = {
    none: t.school.statusNone,
    pending: t.school.statusPending,
    verified: t.school.statusVerified,
    rejected: t.school.statusRejected,
    suspended: t.school.statusSuspended,
    expired: t.school.statusExpired,
    pending_change: t.school.statusPendingChange,
  };

  const showCodeForm = status === 'none' || status === 'rejected' || status === 'expired';

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.back}>{t.settings.back}</Text>
      </Pressable>
      <Text style={styles.title}>{t.school.title}</Text>
      <Text style={styles.sub}>{t.school.sub}</Text>

      <View style={styles.block}>
        <Text style={styles.label}>{t.school.statusLabel}</Text>
        <Text style={styles.status}>{statusCopy[status]}</Text>
        {schoolName ? <Text style={styles.schoolName}>{schoolName}</Text> : null}
      </View>

      {showCodeForm ? (
        <View style={styles.block}>
          <Text style={styles.label}>{t.school.codeLabel}</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder={t.school.codePlaceholder}
            placeholderTextColor={colors.soft}
            style={styles.input}
            accessibilityLabel={t.school.codeLabel}
          />
          <Pressable
            style={[styles.btn, busy && { opacity: 0.6 }]}
            onPress={() => void onSubmit()}
            disabled={busy}
            accessibilityRole="button"
          >
            <Text style={styles.btnText}>{t.school.submitCode}</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12, minHeight: 44 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 6, marginBottom: 20, color: colors.muted, lineHeight: 20 },
  block: { marginBottom: 20 },
  label: { fontSize: 12, color: colors.soft, letterSpacing: 1, marginBottom: 8 },
  status: { fontSize: 18, fontWeight: '600', color: colors.ink },
  schoolName: { marginTop: 6, color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.ink,
    marginBottom: 12,
  },
  btn: {
    borderRadius: 14,
    backgroundColor: colors.ink,
    padding: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: colors.bg, fontWeight: '600' },
  error: { marginTop: 8, color: colors.warn },
});
