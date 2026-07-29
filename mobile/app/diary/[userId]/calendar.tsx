import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppErrorState, AppForbiddenState, AppLoadingState } from '@/components/states';
import {
  canViewDiary,
  getProfile,
  getSessionProfile,
  listRecentDiaryEntries,
} from '@/features/local/repository';
import { toAppError } from '@/lib/errors';
import { colors } from '@/constants/theme';
import { useLocale, useMessages } from '@/i18n';
import type { DiaryEntry, Profile } from '@/types/domain';

type Row = {
  key: string;
  dateLabel: string;
  note: string;
};

export default function DiaryCalendarScreen() {
  const t = useMessages();
  const [locale] = useLocale();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [owner, setOwner] = useState<Profile | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [isMine, setIsMine] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      const session = await getSessionProfile();
      if (!session) {
        setError(t.errors.auth);
        return;
      }
      const profile = await getProfile(userId);
      if (!profile) {
        setError(t.errors.notFound);
        return;
      }
      setOwner(profile);
      const mine = session.id === profile.id;
      setIsMine(mine);

      const recent = await listRecentDiaryEntries(userId, 42);
      const visible: DiaryEntry[] = [];
      for (const e of recent) {
        if (mine || (await canViewDiary(session.id, userId, e))) {
          visible.push(e);
        }
      }

      if (!mine && recent.length > 0 && visible.length === 0) {
        setForbidden(true);
        return;
      }

      setRows(
        visible.map((e) => ({
          key: e.id,
          dateLabel: e.entryDate,
          note: e.tenCharText?.trim() || e.shortText?.trim() || '·',
        })),
      );
    } catch (e) {
      const app = toAppError(e);
      if (app.code === 'FORBIDDEN') setForbidden(true);
      else setError(app.message);
    } finally {
      setLoading(false);
    }
  }, [userId, t.errors.auth, t.errors.notFound]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppLoadingState />
      </SafeAreaView>
    );
  }

  if (forbidden) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppForbiddenState
          title={t.diary.privateBlocked}
          actionLabel={locale === 'ko' ? '뒤로' : 'Back'}
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button">
        <Text style={styles.back}>{locale === 'ko' ? '← 뒤로' : '← Back'}</Text>
      </Pressable>
      <Text style={styles.title}>{t.calendar.title}</Text>
      <Text style={styles.sub}>
        {owner
          ? locale === 'ko'
            ? `${owner.displayName}의 지난 글`
            : `${owner.displayName}’s past entries`
          : t.calendar.sub}
      </Text>
      {error ? <AppErrorState message={error} /> : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {locale === 'ko' ? '아직 지난 글이 없어요.' : 'No past entries yet.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => {
              if (isMine && userId) {
                router.replace({
                  pathname: '/diary/[userId]',
                  params: { userId },
                });
              }
            }}
            accessibilityRole="button"
          >
            <Text style={styles.date}>{item.dateLabel}</Text>
            <Text style={styles.note} numberOfLines={2}>
              {item.note}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '600', color: colors.ink },
  sub: { marginTop: 8, marginBottom: 12, color: colors.muted, lineHeight: 20 },
  list: { paddingBottom: 28, gap: 8 },
  row: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(74,63,85,0.18)',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  date: { fontSize: 12, fontWeight: '700', color: colors.ink },
  note: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  empty: { marginTop: 32, textAlign: 'center', color: colors.muted, fontSize: 13 },
});
