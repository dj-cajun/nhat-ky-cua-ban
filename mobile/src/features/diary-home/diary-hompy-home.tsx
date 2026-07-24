import { router } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { DiaryMusicCard } from '@/features/diary-music/diary-music.types';
import { DiaryMusicCardView } from '@/features/diary-music/diary-music-card';
import type { GuestbookRow } from '@/features/local/repository';
import { openDiaryFromCircle } from '@/features/universe-home/circle-visit';
import { hompy } from '@/constants/hompy-theme';
import { useLocale, useMessages, APP_NAME } from '@/i18n';
import {
  DIARY_MOODS,
  type CircleSummary,
  type DiaryEntry,
  type Profile,
} from '@/types/domain';

export type VisitMember = { id: string; name: string };

type Props = {
  me: Profile;
  owner: Profile;
  entry: DiaryEntry | null;
  recentEntries: DiaryEntry[];
  guestbook: GuestbookRow[];
  guestbookAuthors: Record<string, string>;
  circles: CircleSummary[];
  visitMembers: VisitMember[];
  music: DiaryMusicCard | null;
  canView: boolean;
  onEditToday: () => void;
  onOpenMusic?: () => void;
  /** Prefer stack unwind / circle graph over jumping to universe. */
  onBack?: () => void;
  backLabel?: string;
  /** Keep circle context when hopping between friend homes. */
  fromCircleId?: string;
};

/**
 * Pastel mini-hompy shell for Your Diary (mobile).
 * Visual mapping from web `DiaryHomePage` / docs/your-diary/18-minihome-ui-mapping.md
 */
export function DiaryHompyHome({
  me,
  owner,
  entry,
  recentEntries,
  guestbook,
  guestbookAuthors,
  circles,
  visitMembers,
  music,
  canView,
  onEditToday,
  onOpenMusic,
  onBack,
  backLabel,
  fromCircleId,
}: Props) {
  const t = useMessages();
  const [locale] = useLocale();
  const isMine = me.id === owner.id;
  const moodMeta = DIARY_MOODS.find((m) => m.id === entry?.mood);
  const brand = locale === 'ko' ? '너의 다이어리' : APP_NAME;
  const circle = circles[0];

  const week = useMemo(() => buildWeek(recentEntries, locale), [recentEntries, locale]);

  const openDiary = (targetId: string) => {
    if (fromCircleId) {
      openDiaryFromCircle(targetId, fromCircleId);
      return;
    }
    router.push(`/diary/${targetId}`);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.replace('/(tabs)/universe');
  };

  const resolvedBackLabel =
    backLabel ?? (locale === 'ko' ? '내 우주' : 'Universe');

  return (
    <View style={styles.shell}>
      <ScrollView contentContainerStyle={styles.canvas} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, styles.sky]}>
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            style={styles.headerBtn}
          >
            <Text style={styles.headerBtnText}>← {resolvedBackLabel}</Text>
          </Pressable>
          <Text style={styles.brand}>{brand}</Text>
          <View style={{ width: 64 }} />
        </View>

        <View style={[styles.card, styles.blush]}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{owner.displayName.slice(0, 1)}</Text>
            </View>
            <View style={styles.profileMeta}>
              <Text style={styles.name} numberOfLines={1}>
                {owner.displayName}
              </Text>
              <Text style={styles.moodLine}>
                {moodMeta
                  ? `${moodMeta.emoji} ${moodMeta.label}`
                  : t.diary.noMood}
              </Text>
              {circle ? (
                <Text style={styles.circleLine} numberOfLines={1}>
                  {circle.symbol} {circle.name}
                </Text>
              ) : null}
            </View>
            {isMine ? (
              <Pressable style={styles.hardBtn} onPress={onEditToday} accessibilityRole="button">
                <Text style={styles.hardBtnText}>{t.diary.editToday}</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.todayMe}>
            <Text style={styles.todayLabel}>
              {locale === 'ko' ? '오늘 나는' : 'Today I…'}
            </Text>
            <Text style={styles.todayText}>
              {canView
                ? entry?.tenCharText?.trim() ||
                  entry?.shortText?.trim() ||
                  (isMine ? t.diary.emptyToday : t.diary.emptyOther)
                : t.diary.privateBlocked}
            </Text>
          </View>
        </View>

        {visitMembers.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.card, styles.lemon, { maxHeight: 52 }]}
            contentContainerStyle={styles.visitRow}
          >
            <Pressable
              style={[styles.chip, isMine && styles.chipOn]}
              onPress={() => openDiary(me.id)}
            >
              <Text style={[styles.chipText, isMine && styles.chipTextOn]}>
                {locale === 'ko' ? '내 홈' : 'My home'}
              </Text>
            </Pressable>
            {visitMembers.map((m) => {
              const on = m.id === owner.id;
              return (
                <Pressable
                  key={m.id}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => openDiary(m.id)}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
                    {m.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <View style={styles.grid2}>
          <View style={[styles.card, styles.mint, styles.gridCell]}>
            <Text style={styles.panelTitle}>
              {new Date().getFullYear()}.{new Date().getMonth() + 1}
            </Text>
            {week.map((d) => (
              <Pressable
                key={d.key}
                style={styles.weekRow}
                onPress={() => (isMine ? onEditToday() : router.push(`/diary/${owner.id}/calendar`))}
              >
                <Text style={styles.weekDay}>{d.day}</Text>
                <Text style={styles.weekN}>{d.n}</Text>
                <Text style={styles.weekNote} numberOfLines={1}>
                  {d.note}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.card, styles.peach, styles.gridCell, styles.album]}
            onPress={() => router.push(`/diary/${owner.id}/album`)}
          >
            <Text style={styles.panelTitle}>
              {locale === 'ko' ? '미니 사진첩' : 'Mini album'}
            </Text>
            <View style={styles.albumInner}>
              <Text style={styles.albumGlyph}>▣</Text>
              <Text style={styles.albumHint}>
                {canView && entry
                  ? locale === 'ko'
                    ? '오늘의 한 컷'
                    : "Today’s frame"
                  : locale === 'ko'
                    ? '아직 사진이 없어요'
                    : 'No photos yet'}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={[styles.card, styles.lavender]}>
          <Text style={styles.panelTitle}>
            {locale === 'ko' ? '짧은 글' : 'Short entry'}
          </Text>
          {canView && entry?.shortText ? (
            <Text style={styles.body}>{entry.shortText}</Text>
          ) : (
            <Text style={styles.emptyHint}>
              {locale === 'ko' ? '아직 짧은 글이 없어요.' : 'No short entry yet.'}
            </Text>
          )}

          <Text style={[styles.panelTitle, { marginTop: 12 }]}>{t.diary.guestbook}</Text>
          {guestbook.length > 0 ? (
            guestbook.slice(0, 4).map((g) => (
              <Text key={g.id} style={styles.gbLine} numberOfLines={2}>
                <Text style={styles.gbAuthor}>
                  {guestbookAuthors[g.authorUserId] ?? '·'} ·{' '}
                </Text>
                {g.body}
              </Text>
            ))
          ) : (
            <Text style={styles.emptyHint}>
              {locale === 'ko' ? '아직 방명록이 없어요.' : 'No guestbook notes yet.'}
            </Text>
          )}

          <View style={styles.linkRow}>
            <Pressable
              style={styles.hardBtn}
              onPress={() => router.push(`/diary/${owner.id}/guestbook`)}
            >
              <Text style={styles.hardBtnText}>
                {locale === 'ko' ? '방명록 →' : 'Guestbook →'}
              </Text>
            </Pressable>
            {circle ? (
              <Pressable
                style={styles.hardBtn}
                onPress={() => router.push(`/circles/${circle.id}/anonymous-board`)}
              >
                <Text style={styles.hardBtnText}>
                  {locale === 'ko' ? '가명 게시판 →' : 'Alias board →'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {music ? (
            <View style={{ marginTop: 10 }}>
              <DiaryMusicCardView music={music} onOpen={() => onOpenMusic?.()} />
            </View>
          ) : (
            <Text style={[styles.emptyHint, { marginTop: 10 }]}>
              ♪ {t.diaryMusic.emptyToday}
            </Text>
          )}
        </View>

        {!isMine ? (
          <View style={styles.safetyRow}>
            <Pressable
              style={styles.hardBtn}
              onPress={() =>
                router.push({
                  pathname: '/messages/compose',
                  params: { recipientId: owner.id },
                })
              }
            >
              <Text style={styles.hardBtnText}>{t.diary.leaveNote}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function buildWeek(entries: DiaryEntry[], locale: string) {
  const days =
    locale === 'ko'
      ? ['일', '월', '화', '수', '목', '금', '토']
      : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const byDate = new Map(entries.map((e) => [e.entryDate, e]));
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const entry = byDate.get(key);
    return {
      key,
      day: days[i]!,
      n: d.getDate(),
      note: entry?.tenCharText?.trim() || '·',
    };
  });
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: hompy.table, padding: 8 },
  canvas: {
    gap: 8,
    padding: 8,
    paddingBottom: 36,
    backgroundColor: hompy.canvas,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(139,122,158,0.25)',
  },
  card: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 12,
    backgroundColor: hompy.paper,
  },
  sky: {
    backgroundColor: hompy.sky,
    borderColor: hompy.skyInk,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blush: { backgroundColor: hompy.blush, borderColor: hompy.blushInk },
  lemon: { backgroundColor: hompy.lemon, borderColor: hompy.lemonInk },
  mint: { backgroundColor: hompy.mint, borderColor: hompy.mintInk },
  peach: { backgroundColor: hompy.peach, borderColor: hompy.peachInk },
  lavender: { backgroundColor: hompy.lavender, borderColor: hompy.lavenderInk },
  headerBtn: { minHeight: 36, justifyContent: 'center' },
  headerBtnText: { fontSize: 11, fontWeight: '700', color: hompy.ink },
  brand: { fontSize: 12, fontWeight: '700', color: hompy.ink, letterSpacing: 0.4 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: hompy.blushInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: hompy.ink },
  profileMeta: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '700', color: hompy.ink },
  moodLine: { marginTop: 2, fontSize: 11, color: hompy.muted },
  circleLine: { marginTop: 2, fontSize: 10, color: hompy.soft },
  hardBtn: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: hompy.hard,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  hardBtnText: { fontSize: 10, fontWeight: '700', color: hompy.ink },
  todayMe: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,164,196,0.45)',
  },
  todayLabel: { fontSize: 10, fontWeight: '700', color: hompy.muted, marginBottom: 4 },
  todayText: { fontSize: 13, color: hompy.ink, lineHeight: 18 },
  visitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D0CAD8',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: hompy.hard, borderColor: hompy.hard },
  chipText: { fontSize: 11, fontWeight: '700', color: hompy.ink, maxWidth: 88 },
  chipTextOn: { color: '#fff' },
  grid2: { flexDirection: 'row', gap: 8 },
  gridCell: { flex: 1, minHeight: 168 },
  panelTitle: { fontSize: 10, fontWeight: '700', color: hompy.muted, marginBottom: 6 },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    paddingBottom: 3,
    marginBottom: 3,
  },
  weekDay: { width: 14, fontSize: 10, fontWeight: '700', color: hompy.soft },
  weekN: { width: 16, fontSize: 10, color: hompy.ink },
  weekNote: { flex: 1, fontSize: 10, color: hompy.muted },
  album: { justifyContent: 'flex-start' },
  albumInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    padding: 8,
    minHeight: 120,
  },
  albumGlyph: { fontSize: 28, color: hompy.peachInk, marginBottom: 6 },
  albumHint: { fontSize: 10, color: hompy.muted, textAlign: 'center' },
  body: { fontSize: 12, color: hompy.ink, lineHeight: 18 },
  emptyHint: { fontSize: 10, color: hompy.soft },
  gbLine: { fontSize: 11, color: hompy.ink, marginBottom: 4 },
  gbAuthor: { color: hompy.soft },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  safetyRow: { flexDirection: 'row', gap: 8 },
});
