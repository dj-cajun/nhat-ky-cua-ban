import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppEmptyState, AppErrorState, AppLoadingState } from '@/components/states';
import { formatNoteRelativeTime } from '@/features/private-messages/private-message.validation';
import { useReceivedMessages } from '@/features/private-messages/use-received-messages';
import { useSentMessages } from '@/features/private-messages/use-sent-messages';
import { getSessionProfile } from '@/features/local/repository';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

type Tab = 'inbox' | 'sent';

export default function MessagesScreen() {
  const [meId, setMeId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('inbox');
  const received = useReceivedMessages(meId);
  const sent = useSentMessages(meId);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const me = await getSessionProfile();
        if (!me) {
          router.replace('/(auth)/sign-in');
          return;
        }
        setMeId(me.id);
      })();
    }, []),
  );

  const loading = tab === 'inbox' ? received.loading : sent.loading;
  const error = tab === 'inbox' ? received.error : sent.error;

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>{en.messages.title}</Text>
      <Text style={styles.sub}>{en.messages.sub}</Text>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === 'inbox' && styles.tabOn]}
          onPress={() => setTab('inbox')}
        >
          <Text style={tab === 'inbox' ? styles.tabTextOn : styles.tabText}>
            {en.messages.inbox}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'sent' && styles.tabOn]}
          onPress={() => setTab('sent')}
        >
          <Text style={tab === 'sent' ? styles.tabTextOn : styles.tabText}>
            {en.messages.sent}
          </Text>
        </Pressable>
      </View>

      <Pressable style={styles.settings} onPress={() => router.push('/messages/preferences')}>
        <Text style={styles.settingsText}>{en.messages.preferences}</Text>
      </Pressable>

      {error ? <AppErrorState message={error} /> : null}

      {!meId ? <AppLoadingState /> : null}

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => void (tab === 'inbox' ? received.reload() : sent.reload())}
          />
        }
      >
        {tab === 'inbox'
          ? received.items.map((item) => (
              <Pressable
                key={item.id}
                style={styles.card}
                onPress={() => router.push(`/messages/${item.id}`)}
              >
                <Text style={styles.from}>
                  {item.senderDisplay}
                  {!item.isOpened ? ` · ${en.messages.newBadge}` : ''}
                </Text>
                <Text style={styles.circle}>{item.circle.name}</Text>
                <Text style={styles.body} numberOfLines={3}>
                  {item.body}
                </Text>
                <Text style={styles.time}>{formatNoteRelativeTime(item.createdAt)}</Text>
              </Pressable>
            ))
          : sent.items.map((item) => (
              <Pressable
                key={item.id}
                style={styles.card}
                onPress={() => router.push(`/messages/${item.id}?folder=sent`)}
              >
                <Text style={styles.from}>
                  {en.messages.to(item.recipientDisplay)}
                  {item.senderMode === 'alias' ? ` · ${en.messages.asAlias}` : ''}
                </Text>
                <Text style={styles.circle}>{item.circle.name}</Text>
                <Text style={styles.body} numberOfLines={3}>
                  {item.body}
                </Text>
                <Text style={styles.time}>{formatNoteRelativeTime(item.createdAt)}</Text>
              </Pressable>
            ))}

        {(tab === 'inbox' ? received.items : sent.items).length === 0 && !loading ? (
          <AppEmptyState
            title={tab === 'inbox' ? en.messages.emptyInbox : en.messages.emptySent}
          />
        ) : null}

        {tab === 'inbox' && received.nextCursor ? (
          <Pressable style={styles.more} onPress={() => void received.loadMore()}>
            <Text style={styles.moreText}>{en.messages.loadMore}</Text>
          </Pressable>
        ) : null}
        {tab === 'sent' && sent.nextCursor ? (
          <Pressable style={styles.more} onPress={() => void sent.loadMore()}>
            <Text style={styles.moreText}>{en.messages.loadMore}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 16 },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  tabOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  tabText: { color: colors.ink, fontSize: 13 },
  tabTextOn: { color: '#fff', fontSize: 13 },
  settings: { marginTop: 12, marginBottom: 8 },
  settingsText: { color: colors.accent, fontSize: 13 },
  card: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
  },
  from: { fontSize: 14, fontWeight: '600', color: colors.ink },
  circle: { marginTop: 2, fontSize: 12, color: colors.soft },
  body: { marginTop: 8, fontSize: 14, color: colors.ink, lineHeight: 20 },
  time: { marginTop: 8, fontSize: 11, color: colors.soft },
  empty: { marginTop: 40, textAlign: 'center', color: colors.soft },
  more: { marginTop: 12, alignItems: 'center', padding: 10 },
  moreText: { color: colors.accent },
  error: { color: colors.warn, marginTop: 8, fontSize: 12 },
});
