import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BETA_SCHOOL_ID } from '@/features/local/school';
import { getSessionProfile } from '@/features/local/repository';
import { opsService } from '@/features/ops/ops.service';
import {
  AppEmptyState,
  AppErrorState,
  AppForbiddenState,
  AppLoadingState,
} from '@/components/states';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
import { toAppError } from '@/lib/errors';

export default function OpsSchoolCodesScreen() {
  const t = useMessages();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [actorId, setActorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [rows, setRows] = useState<
    {
      id: string;
      schoolName: string;
      label?: string;
      disabled: boolean;
    }[]
  >([]);

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
      if (!caps.isModerator) {
        setForbidden(true);
        return;
      }
      setForbidden(false);
      const list = await opsService.listSchoolInviteCodes(me.id);
      setRows(
        list.map((r) => ({
          id: r.id,
          schoolName: r.schoolName,
          label: r.label,
          disabled: r.disabled,
        })),
      );
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

  const create = async () => {
    if (!actorId) return;
    setError('');
    try {
      await opsService.createSchoolInviteCode({
        actorId,
        schoolId: BETA_SCHOOL_ID,
        code,
        label,
      });
      setCode('');
      setLabel('');
      await reload();
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  const disable = async (codeId: string) => {
    if (!actorId) return;
    setError('');
    try {
      await opsService.disableSchoolInviteCode({ actorId, codeId });
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
  if (error && rows.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppErrorState message={error} onRetry={() => void reload()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <Text style={styles.back}>{t.ops.back}</Text>
      </Pressable>
      <Text style={styles.title}>{t.ops.codesTitle}</Text>
      <Text style={styles.sub}>{t.ops.codesSub}</Text>

      <Text style={styles.label}>{t.ops.codesCodeLabel}</Text>
      <TextInput
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        style={styles.input}
        placeholderTextColor={colors.soft}
      />
      <Text style={styles.label}>{t.ops.codesLabelLabel}</Text>
      <TextInput
        value={label}
        onChangeText={setLabel}
        style={styles.input}
        placeholderTextColor={colors.soft}
      />
      <Pressable style={styles.create} onPress={() => void create()} accessibilityRole="button">
        <Text style={styles.createText}>{t.ops.codesCreate}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView contentContainerStyle={{ paddingBottom: 40, marginTop: 16 }}>
        {rows.length === 0 ? (
          <AppEmptyState title={t.ops.codesEmpty} />
        ) : (
          rows.map((r) => (
            <View key={r.id} style={styles.card}>
              <Text style={styles.school}>{r.schoolName}</Text>
              <Text style={styles.meta}>
                {r.label ?? r.id.slice(0, 8)}
                {r.disabled ? ` · ${t.ops.codesDisabled}` : ''}
              </Text>
              {!r.disabled ? (
                <Pressable
                  style={styles.disable}
                  onPress={() => void disable(r.id)}
                  accessibilityRole="button"
                >
                  <Text style={styles.disableText}>{t.ops.codesDisable}</Text>
                </Pressable>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12, minHeight: 44 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 6, marginBottom: 16, color: colors.muted, lineHeight: 20 },
  label: { fontSize: 12, color: colors.soft, letterSpacing: 1, marginBottom: 8 },
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
  create: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: { color: colors.bg, fontWeight: '600' },
  error: { color: colors.warn, marginTop: 8 },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  school: { color: colors.ink, fontWeight: '600', fontSize: 16 },
  meta: { marginTop: 4, color: colors.muted, fontSize: 12 },
  disable: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disableText: { color: colors.warn, fontWeight: '600' },
});
