import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSessionProfile } from '@/features/local/repository';
import { useReportContent } from '@/features/moderation/use-report-content';
import type { ReportReason, ReportTargetType } from '@/features/moderation/moderation.types';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

const REASONS: ReportReason[] = [
  'harassment',
  'threat',
  'hate',
  'sexual_content',
  'privacy',
  'spam',
  'impersonation',
  'self_harm',
  'other',
];

export default function CreateReportScreen() {
  const params = useLocalSearchParams<{
    targetType?: string;
    targetId?: string;
    targetUserId?: string;
  }>();
  const [meId, setMeId] = useState<string | null>(null);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [hideForMe, setHideForMe] = useState(true);
  const [alsoBlock, setAlsoBlock] = useState(false);

  const targetType = (params.targetType === 'diary'
    ? 'diary_entry'
    : params.targetType ?? 'profile') as ReportTargetType;
  const targetId = params.targetId ?? params.targetUserId ?? '';

  const { submit, pending, error, done } = useReportContent({
    reporterId: meId,
    targetType,
    targetId,
    targetUserId: params.targetUserId,
  });

  useEffect(() => {
    void (async () => {
      const me = await getSessionProfile();
      if (!me) {
        router.replace('/(auth)/sign-in');
        return;
      }
      setMeId(me.id);
    })();
  }, []);

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
          {'\n'}
          {hideForMe ? en.reports.hiddenForYou : ''}
          {alsoBlock ? `\n${en.reports.blocked}` : ''}
        </Text>
      ) : (
        <>
          <Text style={styles.label}>{en.reports.reason}</Text>
          <View style={{ gap: 8 }}>
            {REASONS.map((id) => (
              <Pressable
                key={id}
                onPress={() => setReason(id)}
                style={[styles.reason, reason === id && styles.reasonOn]}
              >
                <Text style={{ color: reason === id ? '#fff' : colors.ink }}>
                  {en.reports.reasons[id]}
                </Text>
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

          <Pressable style={styles.check} onPress={() => setHideForMe((v) => !v)}>
            <Text style={{ color: colors.ink }}>
              {hideForMe ? '☑' : '☐'} {en.reports.hideForMe}
            </Text>
          </Pressable>

          {params.targetUserId ? (
            <Pressable style={styles.check} onPress={() => setAlsoBlock((v) => !v)}>
              <Text style={{ color: colors.ink }}>
                {alsoBlock ? '☑' : '☐'} {en.reports.blockUser}
              </Text>
            </Pressable>
          ) : null}
          {alsoBlock ? <Text style={styles.hint}>{en.reports.blockConfirm}</Text> : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.btn, (!reason || pending) && { opacity: 0.4 }]}
            disabled={!reason || pending}
            onPress={() =>
              void submit({
                reason: reason as ReportReason,
                details,
                hideForMe,
                alsoBlock,
              })
            }
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
  hint: { marginTop: 8, color: colors.soft, fontSize: 12, lineHeight: 18 },
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
