import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getSessionProfile,
  listMyJoinRecommendations,
} from '@/features/local/repository';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

export default function RecommendationsInboxScreen() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listMyJoinRecommendations>>>([]);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const me = await getSessionProfile();
        if (!me) {
          router.replace('/(auth)/sign-in');
          return;
        }
        setItems(await listMyJoinRecommendations(me.id));
      })();
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>{en.recommendations.back}</Text>
        </Pressable>
        <Text style={styles.title}>{en.recommendations.title}</Text>
        {items.length === 0 ? (
          <Text style={styles.empty}>{en.recommendations.empty}</Text>
        ) : (
          items.map((item) => (
            <Pressable
              key={item.recommendationId}
              style={styles.card}
              onPress={() => router.push(`/recommendations/${item.recommendationId}`)}
            >
              <Text style={styles.name}>{item.applicantDisplayName}</Text>
              <Text style={styles.meta}>{en.recommendations.forCircle(item.circleName)}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink, marginBottom: 16 },
  empty: { color: colors.soft, marginTop: 24 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 10,
  },
  name: { fontSize: 16, fontWeight: '600', color: colors.ink },
  meta: { marginTop: 4, color: colors.soft, fontSize: 12 },
});
