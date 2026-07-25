import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BETA_SCHOOL_ID } from '@/features/local/school';
import { getSessionProfile } from '@/features/local/repository';
import { opsService } from '@/features/ops/ops.service';
import {
  AppErrorState,
  AppForbiddenState,
  AppLoadingState,
} from '@/components/states';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
import { toAppError } from '@/lib/errors';

/**
 * Beta safety actions: membership suspend/reinstate + school merge (admin).
 * Reason required. All changes audit. No diary/message browse.
 */
export default function OpsSafetyScreen() {
  const t = useMessages();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [canMerge, setCanMerge] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [actorId, setActorId] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [schoolId, setSchoolId] = useState(BETA_SCHOOL_ID);
  const [note, setNote] = useState('');
  const [keepId, setKeepId] = useState(BETA_SCHOOL_ID);
  const [absorbId, setAbsorbId] = useState('');
  const [schools, setSchools] = useState<{ id: string; displayName: string; status: string }[]>(
    [],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const me = await getSessionProfile();
      if (!me) {
        router.replace('/(auth)/sign-in');
        return;
      }
      setActorId(me.id);
      const caps = await opsService.getCapabilities(me.id);
      if (!caps.isModerator || !caps.allowedActions.includes('membership_suspend')) {
        setForbidden(true);
        return;
      }
      setForbidden(false);
      setCanMerge(caps.allowedActions.includes('school_merge'));
      setSchools(await opsService.listSchools(me.id));
    } catch (e) {
      const app = toAppError(e);
      if (app.code === 'FORBIDDEN') setForbidden(true);
      else setError(app.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const setMembership = async (status: 'suspended' | 'verified') => {
    if (!actorId) return;
    setError('');
    setOk('');
    if (!note.trim()) {
      setError(t.ops.reasonRequired);
      return;
    }
    try {
      await opsService.setSchoolMembershipStatus({
        actorId,
        userId: userId.trim(),
        schoolId: schoolId.trim(),
        status,
        note: note.trim(),
      });
      setOk(status === 'suspended' ? t.ops.safetySuspended : t.ops.safetyReinstated);
      setNote('');
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  const merge = async () => {
    if (!actorId) return;
    setError('');
    setOk('');
    if (!note.trim()) {
      setError(t.ops.reasonRequired);
      return;
    }
    try {
      const res = await opsService.mergeSchools({
        actorId,
        keepSchoolId: keepId.trim(),
        absorbSchoolId: absorbId.trim(),
        note: note.trim(),
      });
      setOk(t.ops.safetyMerged(res.movedCircles, res.movedCodes));
      setNote('');
      await reload();
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppLoadingState />
      </SafeAreaView>
    );
  }
  if (forbidden) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppForbiddenState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>{t.ops.back}</Text>
        </Pressable>
        <Text style={styles.title}>{t.ops.safetyTitle}</Text>
        <Text style={styles.sub}>{t.ops.safetySub}</Text>

        <Text style={styles.label}>{t.ops.reasonLabel}</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={t.ops.reasonPlaceholder}
          placeholderTextColor={colors.soft}
          style={styles.input}
        />

        <Text style={styles.section}>{t.ops.safetyMembership}</Text>
        <Text style={styles.label}>{t.ops.safetyUserId}</Text>
        <TextInput
          value={userId}
          onChangeText={setUserId}
          autoCapitalize="none"
          style={styles.input}
          placeholderTextColor={colors.soft}
        />
        <Text style={styles.label}>{t.ops.safetySchoolId}</Text>
        <TextInput
          value={schoolId}
          onChangeText={setSchoolId}
          autoCapitalize="none"
          style={styles.input}
          placeholderTextColor={colors.soft}
        />
        <View style={styles.row}>
          <Pressable
            style={styles.warnBtn}
            onPress={() => void setMembership('suspended')}
            accessibilityRole="button"
          >
            <Text style={styles.warnText}>{t.ops.safetySuspend}</Text>
          </Pressable>
          <Pressable
            style={styles.btn}
            onPress={() => void setMembership('verified')}
            accessibilityRole="button"
          >
            <Text style={styles.btnText}>{t.ops.safetyReinstate}</Text>
          </Pressable>
        </View>

        {canMerge ? (
          <>
            <Text style={styles.section}>{t.ops.safetyMerge}</Text>
            <Text style={styles.hint}>{t.ops.safetyMergeHint}</Text>
            <Text style={styles.label}>{t.ops.safetyKeepSchool}</Text>
            {schools
              .filter((s) => s.status === 'active')
              .map((s) => (
                <Pressable
                  key={s.id}
                  style={[styles.pick, keepId === s.id && styles.pickOn]}
                  onPress={() => setKeepId(s.id)}
                >
                  <Text style={[styles.pickText, keepId === s.id && styles.pickTextOn]}>
                    {s.displayName}
                  </Text>
                </Pressable>
              ))}
            <Text style={[styles.label, { marginTop: 12 }]}>{t.ops.safetyAbsorbSchool}</Text>
            {schools.map((s) => (
              <Pressable
                key={`a-${s.id}`}
                style={[styles.pick, absorbId === s.id && styles.pickOn]}
                onPress={() => setAbsorbId(s.id)}
              >
                <Text style={[styles.pickText, absorbId === s.id && styles.pickTextOn]}>
                  {s.displayName} ({s.status})
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={[styles.btn, { marginTop: 12 }, !absorbId && { opacity: 0.5 }]}
              onPress={() => void merge()}
              disabled={!absorbId}
              accessibilityRole="button"
            >
              <Text style={styles.btnText}>{t.ops.safetyMergeAction}</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.hint}>{t.ops.safetyMergeAdminOnly}</Text>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {ok ? <Text style={styles.ok}>{ok}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12, minHeight: 44 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 6, marginBottom: 16, color: colors.muted, lineHeight: 20 },
  section: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 12,
    letterSpacing: 1,
    color: colors.soft,
  },
  label: { fontSize: 12, color: colors.soft, letterSpacing: 1, marginBottom: 8 },
  hint: { color: colors.muted, marginBottom: 12, lineHeight: 18 },
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
  row: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: colors.bg, fontWeight: '600' },
  warnBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warnText: { color: colors.warn, fontWeight: '600' },
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
  error: { marginTop: 12, color: colors.warn },
  ok: { marginTop: 12, color: colors.ink },
});
