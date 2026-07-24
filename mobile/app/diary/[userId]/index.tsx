import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  canViewDiary,
  getDiary,
  getProfile,
  getSessionProfile,
  upsertDiary,
} from '@/features/local/repository';
import { toAppError } from '@/lib/errors';
import { track } from '@/lib/logger';
import {
  DIARY_MOODS,
  MAX_TEN_CHAR,
  type DiaryEntry,
  type DiaryMood,
  type Profile,
} from '@/types/domain';
import { colors } from '@/constants/theme';
import { en } from '@/i18n/en';

export default function DiaryScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [me, setMe] = useState<Profile | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [editing, setEditing] = useState(false);
  const [mood, setMood] = useState<DiaryMood | undefined>();
  const [ten, setTen] = useState('');
  const [shortText, setShortText] = useState('');
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    void (async () => {
      const session = await getSessionProfile();
      if (!session || !userId) {
        router.replace('/(auth)/sign-in');
        return;
      }
      setMe(session);
      setOwner(await getProfile(userId));
      const d = await getDiary(userId);
      setEntry(d);
      if (d) {
        if (!(await canViewDiary(session.id, userId, d)) && session.id !== userId) {
          setBlocked(true);
        }
        setMood(d.mood ?? undefined);
        setTen(d.tenCharText ?? '');
        setShortText(d.shortText ?? '');
      }
    })();
  }, [userId]);

  const isMine = me?.id === userId;
  const moodMeta = DIARY_MOODS.find((m) => m.id === (entry?.mood ?? mood));

  const save = async () => {
    if (!me) return;
    try {
      const saved = await upsertDiary({
        userId: me.id,
        mood,
        tenCharText: ten.trim() || undefined,
        shortText: shortText.trim() || undefined,
        visibilityMode: 'private',
      });
      setEntry(saved);
      setEditing(false);
      track('diary_entry_saved', {
        entry_has_photo: false,
        entry_has_music: false,
        market: 'US',
      });
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  if (!owner) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>{en.diary.back}</Text>
      </Pressable>
        <Text style={styles.title}>{owner.displayName}</Text>
        <Text style={styles.mood}>
          {moodMeta ? `${moodMeta.emoji} ${moodMeta.label}` : en.diary.noMood}
        </Text>

        {blocked ? (
          <Text style={styles.empty}>{en.diary.privateBlocked}</Text>
        ) : editing && isMine ? (
          <View>
            <Text style={styles.label}>{en.diary.mood}</Text>
            <View style={styles.moodRow}>
              {DIARY_MOODS.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setMood(m.id)}
                  style={[styles.chip, mood === m.id && styles.chipOn]}
                >
                  <Text style={{ fontSize: 12 }}>{m.emoji}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>
              {en.diary.tenChar} ({ten.length}/{MAX_TEN_CHAR})
            </Text>
            <TextInput
              value={ten}
              onChangeText={setTen}
              maxLength={MAX_TEN_CHAR}
              style={styles.input}
              placeholderTextColor={colors.soft}
            />
            <Text style={styles.label}>{en.diary.shortText}</Text>
            <TextInput
              value={shortText}
              onChangeText={setShortText}
              maxLength={280}
              multiline
              style={[styles.input, { minHeight: 100 }]}
              placeholderTextColor={colors.soft}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={styles.btn} onPress={() => void save()}>
              <Text style={styles.btnText}>{en.diary.save}</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            {entry?.tenCharText ? (
              <View style={styles.card}>
                <Text style={styles.label}>{en.diary.tenChar}</Text>
                <Text style={styles.ten}>{entry.tenCharText}</Text>
              </View>
            ) : null}
            {entry?.shortText ? (
              <View style={styles.card}>
                <Text style={styles.label}>{en.diary.shortText}</Text>
                <Text style={styles.body}>{entry.shortText}</Text>
              </View>
            ) : null}
            {!entry ? <Text style={styles.empty}>{en.diary.emptyToday}</Text> : null}
          </View>
        )}

        {isMine && !editing ? (
          <Pressable style={styles.btn} onPress={() => setEditing(true)}>
            <Text style={styles.btnText}>{en.diary.editToday}</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.link} onPress={() => router.push(`/diary/${userId}/guestbook`)}>
          <Text>{en.diary.guestbook}</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={() => router.push(`/diary/${userId}/calendar`)}>
          <Text>{en.diary.past}</Text>
        </Pressable>
        <Pressable style={styles.link} onPress={() => router.push(`/diary/${userId}/album`)}>
          <Text>{en.diary.album}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '600', color: colors.ink },
  mood: { marginTop: 6, color: colors.muted, marginBottom: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 12,
  },
  label: { fontSize: 11, color: colors.accent, marginBottom: 6, marginTop: 8 },
  ten: { fontSize: 18, fontWeight: '600', color: colors.ink },
  body: { color: colors.ink, lineHeight: 20 },
  empty: { color: colors.soft, marginVertical: 16 },
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.ink,
  },
  error: { color: colors.warn, marginTop: 8 },
  btn: {
    marginTop: 20,
    backgroundColor: colors.ink,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  link: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: 14,
  },
});
