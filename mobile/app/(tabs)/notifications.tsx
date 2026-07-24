import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getSessionProfile,
  listMyJoinRecommendations,
} from '@/features/local/repository';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

export default function NotificationsScreen() {
  const [pendingRecs, setPendingRecs] = useState(0);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const me = await getSessionProfile();
        if (!me) return;
        const list = await listMyJoinRecommendations(me.id);
        setPendingRecs(list.length);
      })();
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>{en.notifications.title}</Text>
      <Text style={styles.sub}>{en.notifications.sub}</Text>

      <Pressable style={styles.link} onPress={() => router.push('/recommendations')}>
        <Text style={styles.linkText}>
          {en.recommendations.title}
          {pendingRecs > 0 ? ` (${pendingRecs})` : ''}
        </Text>
      </Pressable>

      <Pressable style={styles.link} onPress={() => router.push('/messages')}>
        <Text style={styles.linkText}>{en.messages.title}</Text>
      </Pressable>

      {pendingRecs === 0 ? <Text style={styles.empty}>{en.notifications.empty}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, color: colors.muted, lineHeight: 20 },
  link: {
    marginTop: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: 14,
  },
  linkText: { color: colors.ink },
  empty: { marginTop: 40, color: colors.soft, textAlign: 'center' },
});
