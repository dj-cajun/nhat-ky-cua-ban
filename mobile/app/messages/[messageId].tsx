import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  blockPrivateMessageSender,
  hidePrivateMessage,
} from '@/features/private-messages/private-message.mutations';
import { openPrivateMessage } from '@/features/private-messages/private-message.queries';
import { PrivateMessageMenu } from '@/features/private-messages/private-message-menu';
import { formatNoteRelativeTime } from '@/features/private-messages/private-message.validation';
import type { ReceivedMessageItem } from '@/features/private-messages/private-message.types';
import { getSessionProfile } from '@/features/local/repository';
import { toAppError } from '@/lib/errors';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

export default function MessageDetailScreen() {
  const { messageId, folder } = useLocalSearchParams<{
    messageId: string;
    folder?: string;
  }>();
  const isSent = folder === 'sent';
  const [meId, setMeId] = useState<string | null>(null);
  const [item, setItem] = useState<ReceivedMessageItem | null>(null);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const me = await getSessionProfile();
      if (!me || !messageId) {
        router.replace('/(auth)/sign-in');
        return;
      }
      setMeId(me.id);
      if (isSent) {
        // Sent folder: open is recipient-only; load via list shape is enough for display
        // Re-fetch through received path forbidden — use open only for inbox
        setError('');
        try {
          // For sent, we don't call open (would leak/forbid). Soft-load via sent list is done on index.
          // Detail for sent shows body from a lightweight open attempt only if recipient — skip.
          const { getSentMessages } = await import(
            '@/features/private-messages/private-message.service'
          );
          const page = await getSentMessages({ viewerId: me.id, limit: 50 });
          const found = page.items.find((m) => m.id === messageId);
          if (!found) throw new Error('Not found');
          setItem({
            id: found.id,
            senderMode: found.senderMode,
            senderDisplay: found.recipientDisplay,
            body: found.body,
            circle: found.circle,
            isOpened: true,
            createdAt: found.createdAt,
            replyToMessageId: found.replyToMessageId,
          });
        } catch (e) {
          setError(toAppError(e).message);
        }
        return;
      }
      try {
        const opened = await openPrivateMessage(messageId, me.id);
        setItem(opened);
      } catch (e) {
        setError(toAppError(e).message);
      }
    })();
  }, [messageId, isSent]);

  const onBlock = () => {
    if (!meId || !messageId) return;
    Alert.alert(en.messages.blockConfirmTitle, en.messages.blockConfirmBody, [
      { text: en.messages.cancel, style: 'cancel' },
      {
        text: en.messages.blockConfirm,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await blockPrivateMessageSender(messageId, meId);
              router.replace('/messages');
            } catch (e) {
              setError(toAppError(e).message);
            }
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>{en.messages.back}</Text>
      </Pressable>
      <Text style={styles.title}>{en.messages.detail}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {item ? (
        <View style={styles.card}>
          <Text style={styles.from}>
            {isSent ? en.messages.to(item.senderDisplay) : item.senderDisplay}
          </Text>
          <Text style={styles.circle}>{item.circle.name}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.time}>{formatNoteRelativeTime(item.createdAt)}</Text>

          {!isSent ? (
            <>
              <Pressable style={styles.menuBtn} onPress={() => setMenuOpen((v) => !v)}>
                <Text style={styles.menuBtnText}>{en.messages.menu}</Text>
              </Pressable>
              {menuOpen ? (
                <PrivateMessageMenu
                  onReply={() =>
                    router.push({
                      pathname: '/messages/compose',
                      params: {
                        replyTo: item.id,
                        circleId: item.circle.id,
                        mode: 'named',
                        replyDisplay: item.senderDisplay,
                      },
                    })
                  }
                  onReport={() =>
                    router.push({
                      pathname: '/reports/create',
                      params: { targetType: 'message', targetId: item.id },
                    })
                  }
                  onHide={() => {
                    void (async () => {
                      if (!meId) return;
                      await hidePrivateMessage(item.id, meId);
                      router.replace('/messages');
                    })();
                  }}
                  onBlockSender={onBlock}
                />
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  card: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
  },
  from: { fontSize: 16, fontWeight: '600', color: colors.ink },
  circle: { marginTop: 4, fontSize: 12, color: colors.soft },
  body: { marginTop: 14, fontSize: 15, color: colors.ink, lineHeight: 22 },
  time: { marginTop: 12, fontSize: 11, color: colors.soft },
  menuBtn: { marginTop: 16 },
  menuBtnText: { color: colors.accent, fontSize: 13 },
  error: { marginTop: 8, color: colors.warn },
});
