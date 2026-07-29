import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listSharedCirclesWith } from '@/features/private-messages/private-message.queries';
import { useSendMessage } from '@/features/private-messages/use-send-message';
import { NOTE_BODY_MAX } from '@/features/private-messages/private-message.validation';
import { getProfile, getSessionProfile } from '@/features/local/repository';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
export default function ComposeNoteScreen() {
  const t = useMessages();
  const {
    recipientId,
    circleId: circleParam,
    replyTo,
    mode,
    replyDisplay,
  } = useLocalSearchParams<{
    recipientId?: string;
    circleId?: string;
    replyTo?: string;
    mode?: string;
    replyDisplay?: string;
  }>();
  const isReply = Boolean(replyTo);
  const [meId, setMeId] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState(replyDisplay ?? '');
  const [circles, setCircles] = useState<{ id: string; name: string }[]>([]);
  const [circleId, setCircleId] = useState<string | undefined>(circleParam);

  const compose = useSendMessage({
    senderId: meId,
    recipientId,
    circleId,
    replyToMessageId: replyTo,
    onSent: () => router.replace('/messages'),
  });

  useEffect(() => {
    if (mode === 'alias' || mode === 'named') compose.setMode(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    void (async () => {
      const me = await getSessionProfile();
      if (!me) {
        router.replace('/(auth)/sign-in');
        return;
      }
      setMeId(me.id);
      if (isReply) {
        if (replyDisplay) setRecipientName(replyDisplay);
        return;
      }
      if (!recipientId) {
        router.replace('/messages');
        return;
      }
      const profile = await getProfile(recipientId);
      setRecipientName(profile?.displayName ?? 'Member');
      try {
        const shared = await listSharedCirclesWith(me.id, recipientId);
        setCircles(shared);
        if (!circleId && shared[0]) setCircleId(shared[0].id);
      } catch {
        setCircles([]);
      }
    })();
  }, [recipientId, circleId, isReply, replyDisplay]);

  const canSend = isReply
    ? Boolean(compose.body.trim())
    : Boolean(compose.body.trim() && circleId);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>{t.messages.back}</Text>
        </Pressable>
        <Text style={styles.title}>
          {isReply
            ? t.messages.replyTitle(recipientName || 'them')
            : t.messages.composeTitle(recipientName || 'them')}
        </Text>
        <Text style={styles.sub}>{t.messages.composeSub}</Text>

        <Text style={styles.label}>{t.messages.howToSend}</Text>
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.mode, compose.mode === 'named' && styles.modeOn]}
            onPress={() => compose.setMode('named')}
          >
            <Text style={compose.mode === 'named' ? styles.modeTextOn : styles.modeText}>
              {t.messages.sendNamed}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.mode, compose.mode === 'alias' && styles.modeOn]}
            onPress={() => compose.setMode('alias')}
          >
            <Text style={compose.mode === 'alias' ? styles.modeTextOn : styles.modeText}>
              {t.messages.sendAlias}
            </Text>
          </Pressable>
        </View>

        {!isReply && !circleParam && circles.length > 1 ? (
          <>
            <Text style={styles.label}>{t.messages.pickCircle}</Text>
            <View style={{ gap: 8 }}>
              {circles.map((c) => (
                <Pressable
                  key={c.id}
                  style={[styles.circleOpt, circleId === c.id && styles.circleOptOn]}
                  onPress={() => setCircleId(c.id)}
                >
                  <Text style={{ color: circleId === c.id ? '#fff' : colors.ink }}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {!isReply && circles.length === 0 ? (
          <Text style={styles.error}>{t.messages.noSharedCircle}</Text>
        ) : null}

        <Text style={styles.label}>{t.messages.noteLabel}</Text>
        <TextInput
          value={compose.body}
          onChangeText={compose.setBody}
          placeholder={t.messages.notePlaceholder}
          placeholderTextColor={colors.soft}
          multiline
          maxLength={NOTE_BODY_MAX}
          style={styles.input}
        />
        <Text style={styles.char}>
          {compose.body.trim().length}/{NOTE_BODY_MAX}
        </Text>
        <Text style={styles.notice}>{t.messages.safetyNotice}</Text>
        {compose.error ? <Text style={styles.error}>{compose.error}</Text> : null}

        <Pressable
          style={[styles.send, (compose.pending || !canSend) && styles.sendOff]}
          disabled={compose.pending || !canSend}
          onPress={() => {
            if (compose.mode === 'alias') {
              Alert.alert(t.messages.sendAlias, t.messages.aliasConfirm, [
                { text: t.messages.cancel, style: 'cancel' },
                { text: t.messages.send, onPress: () => void compose.submit() },
              ]);
            } else {
              void compose.submit();
            }
          }}
        >
          <Text style={styles.sendText}>{t.messages.send}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 6, color: colors.muted, lineHeight: 20 },
  label: { marginTop: 18, marginBottom: 8, fontSize: 12, color: colors.soft },
  modeRow: { flexDirection: 'row', gap: 8 },
  mode: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  modeOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  modeText: { color: colors.ink, fontSize: 13 },
  modeTextOn: { color: '#fff', fontSize: 13 },
  circleOpt: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.card,
  },
  circleOptOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    color: colors.ink,
    backgroundColor: colors.card,
    textAlignVertical: 'top',
  },
  char: { marginTop: 4, fontSize: 11, color: colors.soft, textAlign: 'right' },
  notice: { marginTop: 10, fontSize: 11, color: colors.muted, lineHeight: 16 },
  send: {
    marginTop: 16,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sendOff: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '600' },
  error: { marginTop: 10, color: colors.warn, fontSize: 12 },
});
