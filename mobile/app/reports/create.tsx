import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  blockUser,
  getDiary,
  getProfile,
  getSessionProfile,
  submitReport,
} from '@/features/local/repository';
import { toAppError } from '@/lib/errors';
import { track } from '@/lib/logger';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

const REASONS = [
  ['harassment', en.reports.reasons.harassment],
  ['sexual', en.reports.reasons.sexual],
  ['threat', en.reports.reasons.threat],
  ['spam', en.reports.reasons.spam],
  ['other', en.reports.reasons.other],
] as const;

export default function CreateReportScreen() {
  const params = useLocalSearchParams<{
    targetType?: string;
    targetId?: string;
    targetUserId?: string;
  }>();
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [snapshot, setSnapshot] = useState('');

  useEffect(() => {
    void (async () => {
      if (params.targetType === 'profile' && params.targetId) {
        const p = await getProfile(params.targetId);
        setSnapshot(JSON.stringify({ displayName: p?.displayName, id: params.targetId }));
      } else if (params.targetType === 'diary' && params.targetId) {
        const entry = await getDiary(params.targetId);
        setSnapshot(
          JSON.stringify({
            mood: entry?.mood,
            tenCharText: entry?.tenCharText,
            shortText: entry?.shortText?.slice(0, 200),
            entryDate: entry?.entryDate,
          }),
        );
      } else {
        setSnapshot(JSON.stringify({ targetId: params.targetId ?? 'unknown' }));
      }
    })();
  }, [params.targetId, params.targetType]);

  const submit = async () => {
    setError('');
    const me = await getSessionProfile();
    if (!me) {
      router.replace('/(auth)/sign-in');
      return;
    }
    try {
      await submitReport({
        reporterId: me.id,
        targetType: params.targetType ?? 'profile',
        targetId: params.targetId ?? 'unknown',
        reason,
        contentSnapshot: `${snapshot}\n${details}`.trim(),
      });
      if (alsoBlock && params.targetUserId) {
        await blockUser(me.id, params.targetUserId);
      }
      track('report_submitted', {
        target_type: params.targetType ?? 'profile',
        market: 'US',
      });
      setDone(true);
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>{en.reports.title}</Text>
      <Text style={styles.sub}>{en.reports.sub}</Text>

      {done ? (
        <Text style={styles.done}>
          {en.reports.submitted}
          {alsoBlock ? `\n${en.reports.blocked}` : ''}
        </Text>
      ) : (
        <>
          <Text style={styles.label}>{en.reports.reason}</Text>
          <View style={{ gap: 8 }}>
            {REASONS.map(([id, label]) => (
              <Pressable
                key={id}
                onPress={() => setReason(id)}
                style={[styles.reason, reason === id && styles.reasonOn]}
              >
                <Text style={{ color: reason === id ? '#fff' : colors.ink }}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>{en.reports.details}</Text>
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder={en.reports.detailsPlaceholder}
            placeholderTextColor={colors.soft}
            multiline
            style={styles.input}
          />

          {params.targetUserId ? (
            <Pressable
              style={styles.check}
              onPress={() => setAlsoBlock((v) => !v)}
            >
              <Text style={{ color: colors.ink }}>
                {alsoBlock ? '☑' : '☐'} {en.reports.blockUser}
              </Text>
            </Pressable>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.btn, !reason && { opacity: 0.4 }]}
            disabled={!reason}
            onPress={() => void submit()}
          >
            <Text style={styles.btnText}>{en.reports.submit}</Text>
          </Pressable>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, marginBottom: 16, color: colors.muted, lineHeight: 20 },
  label: { fontSize: 12, color: colors.soft, marginBottom: 8, marginTop: 12 },
  reason: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.card,
  },
  reasonOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.card,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  check: { marginTop: 16 },
  btn: {
    marginTop: 20,
    backgroundColor: colors.ink,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  error: { marginTop: 12, color: colors.warn },
  done: { marginTop: 20, color: colors.ink, lineHeight: 22 },
});
