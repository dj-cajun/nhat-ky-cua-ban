import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getRecommendationForViewer,
  getSessionProfile,
  respondCircleRecommendation,
} from '@/features/local/repository';
import { toAppError } from '@/lib/errors';
import { track } from '@/lib/logger';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

export default function RecommendationDetailScreen() {
  const { recommendationId } = useLocalSearchParams<{ recommendationId: string }>();
  const [item, setItem] = useState<Awaited<ReturnType<typeof getRecommendationForViewer>>>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const reload = useCallback(async () => {
    const me = await getSessionProfile();
    if (!me || !recommendationId) {
      router.replace('/(auth)/sign-in');
      return;
    }
    setItem(await getRecommendationForViewer(recommendationId, me.id));
  }, [recommendationId]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const respond = async (decision: 'recommended' | 'unknown') => {
    const me = await getSessionProfile();
    if (!me || !recommendationId) return;
    setError('');
    try {
      await respondCircleRecommendation(recommendationId, me.id, decision);
      track('join_recommendation_responded', { decision, market: 'US' });
      setDone(true);
      await reload();
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  if (!item) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>{en.recommendations.title}</Text>
        <Text style={styles.sub}>{en.errors.forbidden}</Text>
      </SafeAreaView>
    );
  }

  const pending = item.decision === 'pending' && !done;

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>{en.recommendations.back}</Text>
      </Pressable>
      <Text style={styles.title}>{item.applicantDisplayName}</Text>
      <Text style={styles.meta}>{en.recommendations.forCircle(item.circleName)}</Text>
      <Text style={styles.prompt}>{en.recommendations.prompt}</Text>

      {pending ? (
        <View style={{ gap: 10, marginTop: 20 }}>
          <Pressable style={styles.btn} onPress={() => void respond('recommended')}>
            <Text style={styles.btnText}>{en.recommendations.recommend}</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => void respond('unknown')}>
            <Text>{en.recommendations.unknown}</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={() => router.back()}>
            <Text>{en.recommendations.later}</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.done}>Saved. The applicant won’t see your choice.</Text>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '600', color: colors.ink },
  meta: { marginTop: 6, color: colors.soft },
  prompt: { marginTop: 20, color: colors.ink, lineHeight: 22 },
  sub: { marginTop: 12, color: colors.muted },
  btn: {
    backgroundColor: colors.ink,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  secondary: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  done: { marginTop: 24, color: colors.muted, lineHeight: 20 },
  error: { marginTop: 12, color: colors.warn },
});
