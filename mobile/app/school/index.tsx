import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLoadingState } from '@/components/states';
import {
  getMySchoolMembership,
  getSessionProfile,
  listActiveSchoolsForChange,
  requestSchoolChange,
  submitSchoolInviteCode,
} from '@/features/local/repository';
import type { SchoolMembershipStatus } from '@/features/local/school';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
import { toAppError } from '@/lib/errors';

/**
 * Phase C school status surface: code → pending → needs_more_info → verified/rejected,
 * plus school-change request. No school directory, student search, or school home.
 */
export default function SchoolStatusScreen() {
  const t = useMessages();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SchoolMembershipStatus>('none');
  const [schoolName, setSchoolName] = useState<string | undefined>();
  const [reviewNote, setReviewNote] = useState<string | undefined>();
  const [pendingChange, setPendingChange] = useState<
    | {
        requestId: string;
        toSchoolId: string;
        toSchoolName: string;
        status: string;
        reason?: string;
      }
    | undefined
  >();
  const [code, setCode] = useState('');
  const [changeSchools, setChangeSchools] = useState<{ id: string; displayName: string }[]>([]);
  const [pickedSchoolId, setPickedSchoolId] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState('');
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
      setReviewNote(m.reviewNote);
      setPendingChange(m.pendingChange);
      if (m.status === 'verified') {
        try {
          const schools = await listActiveSchoolsForChange(me.id);
          setChangeSchools(schools);
        } catch {
          setChangeSchools([]);
        }
      } else {
        setChangeSchools([]);
      }
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

  const onChangeRequest = async () => {
    if (!userId || !pickedSchoolId) return;
    setBusy(true);
    setError('');
    try {
      await requestSchoolChange({
        userId,
        toSchoolId: pickedSchoolId,
        reason: changeReason,
      });
      setChangeReason('');
      setPickedSchoolId(null);
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
    needs_more_info: t.school.statusNeedsMoreInfo,
    verified: t.school.statusVerified,
    rejected: t.school.statusRejected,
    suspended: t.school.statusSuspended,
    expired: t.school.statusExpired,
    pending_change: t.school.statusPendingChange,
  };

  const showCodeForm =
    status === 'none' ||
    status === 'rejected' ||
    status === 'expired' ||
    status === 'needs_more_info';
  const canEnterCircles = status === 'verified' || status === 'pending_change';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>{t.settings.back}</Text>
        </Pressable>
        <Text style={styles.title}>{t.school.title}</Text>
        <Text style={styles.sub}>{t.school.sub}</Text>

        <View style={styles.block}>
          <Text style={styles.label}>{t.school.statusLabel}</Text>
          <Text style={styles.status}>{statusCopy[status]}</Text>
          {schoolName ? <Text style={styles.schoolName}>{schoolName}</Text> : null}
          {reviewNote ? (
            <>
              <Text style={[styles.label, { marginTop: 14 }]}>{t.school.reviewNoteLabel}</Text>
              <Text style={styles.note}>{reviewNote}</Text>
            </>
          ) : null}
        </View>

        {!canEnterCircles ? (
          <View style={styles.block}>
            <Text style={styles.status}>{t.school.restrictedTitle}</Text>
            <Text style={styles.subInline}>{t.school.restrictedBody}</Text>
          </View>
        ) : null}

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

        {status === 'pending' || status === 'needs_more_info' ? (
          <Text style={styles.hint}>{t.school.opsHint}</Text>
        ) : null}

        {pendingChange || status === 'pending_change' ? (
          <View style={styles.block}>
            <Text style={styles.label}>{t.school.changePending}</Text>
            {pendingChange ? (
              <Text style={styles.schoolName}>→ {pendingChange.toSchoolName}</Text>
            ) : null}
          </View>
        ) : null}

        {status === 'verified' && changeSchools.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.label}>{t.school.changeTitle}</Text>
            <Text style={styles.subInline}>{t.school.changeSub}</Text>
            <Text style={[styles.label, { marginTop: 12 }]}>{t.school.changePick}</Text>
            {changeSchools.map((s) => {
              const on = pickedSchoolId === s.id;
              return (
                <Pressable
                  key={s.id}
                  style={[styles.pick, on && styles.pickOn]}
                  onPress={() => setPickedSchoolId(s.id)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.pickText, on && styles.pickTextOn]}>{s.displayName}</Text>
                </Pressable>
              );
            })}
            <TextInput
              value={changeReason}
              onChangeText={setChangeReason}
              placeholder={t.school.changeReason}
              placeholderTextColor={colors.soft}
              style={[styles.input, { marginTop: 12 }]}
            />
            <Pressable
              style={[styles.btn, (!pickedSchoolId || busy) && { opacity: 0.5 }]}
              onPress={() => void onChangeRequest()}
              disabled={!pickedSchoolId || busy}
              accessibilityRole="button"
            >
              <Text style={styles.btnText}>{t.school.changeSubmit}</Text>
            </Pressable>
          </View>
        ) : null}

        {canEnterCircles ? (
          <Pressable
            style={[styles.btn, styles.btnGhost]}
            onPress={() => router.replace('/(tabs)/universe')}
            accessibilityRole="button"
          >
            <Text style={styles.btnGhostText}>{t.school.continueUniverse}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.btn, styles.btnGhost]}
            onPress={() => router.replace('/(tabs)/universe')}
            accessibilityRole="button"
          >
            <Text style={styles.btnGhostText}>{t.school.continueUniverse}</Text>
          </Pressable>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12, minHeight: 44 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 6, marginBottom: 20, color: colors.muted, lineHeight: 20 },
  subInline: { marginTop: 6, color: colors.muted, lineHeight: 20 },
  block: { marginBottom: 20 },
  label: { fontSize: 12, color: colors.soft, letterSpacing: 1, marginBottom: 8 },
  status: { fontSize: 18, fontWeight: '600', color: colors.ink },
  schoolName: { marginTop: 6, color: colors.muted },
  note: { color: colors.ink, lineHeight: 20 },
  hint: { color: colors.soft, marginBottom: 16, lineHeight: 18 },
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
  pick: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  pickOn: { borderColor: colors.ink, backgroundColor: colors.ink },
  pickText: { color: colors.ink },
  pickTextOn: { color: colors.bg, fontWeight: '600' },
  btn: {
    borderRadius: 14,
    backgroundColor: colors.ink,
    padding: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: colors.bg, fontWeight: '600' },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 8,
  },
  btnGhostText: { color: colors.ink, fontWeight: '600' },
  error: { marginTop: 8, color: colors.warn },
});
