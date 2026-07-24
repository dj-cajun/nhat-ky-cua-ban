import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDiary, getSessionProfile } from '@/features/local/repository';
import { DIARY_MOODS, type DiaryEntry, type Profile } from '@/types/domain';
import { colors } from '@/constants/theme';

export default function MyDiaryTab() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entry, setEntry] = useState<DiaryEntry | null>(null);

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const p = await getSessionProfile();
        if (!p) {
          router.replace('/(auth)/sign-in');
          return;
        }
        setProfile(p);
        setEntry(await getDiary(p.id));
      })();
    }, []),
  );

  if (!profile) return null;
  const mood = DIARY_MOODS.find((m) => m.id === entry?.mood);

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.brand}>너의 다이어리</Text>
      <Text style={styles.title}>{profile.displayName}</Text>
      <Text style={styles.mood}>{mood ? `${mood.emoji} ${mood.label}` : '오늘의 기분 없음'}</Text>

      {entry?.tenCharText ? (
        <View style={styles.card}>
          <Text style={styles.label}>10자 기록</Text>
          <Text style={styles.ten}>{entry.tenCharText}</Text>
        </View>
      ) : null}
      {entry?.shortText ? (
        <View style={styles.card}>
          <Text style={styles.label}>짧은 글</Text>
          <Text style={styles.body}>{entry.shortText}</Text>
        </View>
      ) : null}
      {!entry ? <Text style={styles.empty}>아직 오늘 기록이 없어요.</Text> : null}

      <Pressable style={styles.btn} onPress={() => router.push(`/diary/${profile.id}`)}>
        <Text style={styles.btnText}>오늘 수정 / 전체 보기</Text>
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
  empty: { marginTop: 24, color: colors.soft },
  btn: {
    marginTop: 24,
    backgroundColor: colors.ink,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
});
