import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppEmptyState, AppErrorState, AppLoadingState } from '@/components/states';
import { getDiary, getSessionProfile } from '@/features/local/repository';
import { DIARY_MOODS, type DiaryEntry, type Profile } from '@/types/domain';
import { colors } from '@/constants/theme';
import { useMessages } from '@/i18n';
import { toAppError } from '@/lib/errors';

export default function MyDiaryTab() {
  const t = useMessages();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setError('');
    try {
      const p = await getSessionProfile();
      if (!p) {
        router.replace('/(auth)/sign-in');
        return;
      }
      setProfile(p);
      setEntry(await getDiary(p.id));
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppLoadingState />
      </SafeAreaView>
    );
  }

  if (!profile) return null;
  const mood = DIARY_MOODS.find((m) => m.id === entry?.mood);

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.brand}>{t.diary.brand}</Text>
      <Text style={styles.title}>{profile.displayName}</Text>
      <Text style={styles.mood}>{mood ? `${mood.emoji} ${mood.label}` : t.diary.noMood}</Text>

      {error ? <AppErrorState message={error} onRetry={() => void reload()} /> : null}

      {entry?.tenCharText ? (
        <View style={styles.card}>
          <Text style={styles.label}>{t.diary.tenChar}</Text>
          <Text style={styles.ten}>{entry.tenCharText}</Text>
        </View>
      ) : null}
      {entry?.shortText ? (
        <View style={styles.card}>
          <Text style={styles.label}>{t.diary.shortText}</Text>
          <Text style={styles.body}>{entry.shortText}</Text>
        </View>
      ) : null}
      {!entry && !error ? (
        <AppEmptyState title={t.diary.emptyToday} subtitle={t.diary.emptyTodaySub} />
      ) : null}

      <Pressable
        style={styles.btn}
        onPress={() => router.push(`/diary/${profile.id}`)}
        accessibilityRole="button"
        accessibilityLabel={t.diary.editOrView}
      >
        <Text style={styles.btnText}>{t.diary.editOrView}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  brand: { color: colors.accent, fontSize: 12 },
  title: { marginTop: 4, fontSize: 24, fontWeight: '600', color: colors.ink },
  mood: { marginTop: 6, color: colors.muted },
  card: {
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  label: { fontSize: 11, color: colors.accent },
  ten: { marginTop: 8, fontSize: 18, fontWeight: '600', color: colors.ink },
  body: { marginTop: 8, color: colors.ink, lineHeight: 20 },
  btn: {
    marginTop: 24,
    backgroundColor: colors.ink,
    borderRadius: 16,
    padding: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
});
