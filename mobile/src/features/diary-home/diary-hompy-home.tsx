import { router } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
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
import { DotPaper, OutlineBox } from '@/features/diary-home/hompy-outline';
import { hompy } from '@/constants/hompy-theme';
import { useLocale, useMessages } from '@/i18n';
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
  /** Kept for call-site compatibility; visit strip removed. */
  visitMembers?: VisitMember[];
  music: DiaryMusicCard | null;
  canView: boolean;
  onEditToday: () => void;
  onOpenMusic?: () => void;
  onBack?: () => void;
  backLabel?: string;
  fromCircleId?: string;
};

/**
 * Pastel mini-hompy — web `DiaryHomePage` outline (cy-shell / sk-outline).
 * No brand line, no my-home/friend visit strip.
 */
export function DiaryHompyHome({
  me,
  owner,
  entry,
  recentEntries,
  guestbook,
  guestbookAuthors,
  circles,
  music,
  canView,
  onEditToday,
  onOpenMusic,
  onBack,
  backLabel,
}: Props) {
  const t = useMessages();
  const [locale] = useLocale();
  const isMine = me.id === owner.id;
  const moodMeta = DIARY_MOODS.find((m) => m.id === entry?.mood);
  const circle = circles[0];
  const week = useMemo(() => buildWeek(recentEntries, locale), [recentEntries, locale]);

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
      <OutlineBox
        size="lg"
        fill={hompy.canvas}
        stroke={hompy.pencilBold}
        style={styles.canvasBox}
        contentStyle={styles.canvasContent}
      >
        <DotPaper />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header — back only (no brand line) */}
          <OutlineBox
            fill={hompy.sky}
            stroke={hompy.skyInk}
            contentStyle={styles.header}
          >
            <Pressable
              onPress={handleBack}
              accessibilityRole="button"
              style={styles.headerBtn}
              hitSlop={8}
            >
              <Text style={styles.headerBtnText}>← {resolvedBackLabel}</Text>
            </Pressable>
          </OutlineBox>

          {/* Profile — cy-box-blush */}
          <OutlineBox
            fill={hompy.blush}
            stroke={hompy.blushInk}
            contentStyle={styles.profilePad}
          >
            <View style={styles.profileRow}>
              <OutlineBox
                size="sm"
                fill="#FFFFFF"
                stroke={hompy.blushInk}
                style={styles.avatarBox}
                contentStyle={styles.avatarInner}
              >
                <Text style={styles.avatarText}>{owner.displayName.slice(0, 1)}</Text>
              </OutlineBox>
              <View style={styles.profileMeta}>
                <Text style={styles.name} numberOfLines={1}>
                  {owner.displayName}
                </Text>
                <Text style={styles.moodLine}>
                  {moodMeta ? `${moodMeta.emoji} ${moodMeta.label}` : t.diary.noMood}
                </Text>
                {circle ? (
                  <Text style={styles.circleLine} numberOfLines={1}>
                    {circle.symbol} {circle.name}
                  </Text>
                ) : null}
              </View>
              {isMine ? (
                <HardBtn label={t.diary.editToday} onPress={onEditToday} />
              ) : null}
            </View>

            <OutlineBox
              size="sm"
              fill="rgba(255,255,255,0.72)"
              stroke={hompy.blushInk}
              style={styles.todayMe}
              contentStyle={styles.todayMeInner}
            >
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
            </OutlineBox>
          </OutlineBox>

          {/* Calendar | Album — original 2-col */}
          <View style={styles.grid2}>
            <OutlineBox
              fill={hompy.mint}
              stroke={hompy.mintInk}
              style={styles.gridCell}
              contentStyle={styles.panelPad}
            >
              <Text style={styles.panelTitle}>
                {new Date().getFullYear()}.{new Date().getMonth() + 1}
              </Text>
              {week.map((d) => (
                <Pressable
                  key={d.key}
                  style={styles.weekRow}
                  onPress={() => {
                    if (isMine) onEditToday();
                  }}
                >
                  <Text style={styles.weekDay}>{d.day}</Text>
                  <Text style={styles.weekN}>{d.n}</Text>
                  <Text style={styles.weekNote} numberOfLines={1}>
                    {d.note}
                  </Text>
                </Pressable>
              ))}
            </OutlineBox>

            <OutlineBox
              fill={hompy.peach}
              stroke={hompy.peachInk}
              style={styles.gridCell}
              contentStyle={styles.panelPad}
            >
              <Text style={styles.panelTitle}>
                {locale === 'ko' ? '미니 사진첩' : 'Mini album'}
              </Text>
              <View style={styles.albumInner}>
                <OutlineBox
                  size="sm"
                  fill="#FFFFFF"
                  stroke={hompy.peachInk}
                  style={styles.albumFrame}
                  contentStyle={styles.albumFrameInner}
                >
                  <View style={styles.albumGlyph}>
                    <View style={styles.albumGlyphOuter} />
                    <View style={styles.albumGlyphInner} />
                  </View>
                </OutlineBox>
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
            </OutlineBox>
          </View>

          {/* Board preview — cy-box-lavender */}
          <OutlineBox
            fill={hompy.lavender}
            stroke={hompy.lavenderInk}
            contentStyle={styles.boardPad}
          >
            <BoardBlock
              title={locale === 'ko' ? '짧은 글' : 'Short entry'}
              empty={locale === 'ko' ? '아직 짧은 글이 없어요.' : 'No short entry yet.'}
            >
              {canView && entry?.shortText ? (
                <Text style={styles.body}>{entry.shortText}</Text>
              ) : null}
            </BoardBlock>

            <BoardBlock
              title={t.diary.guestbook}
              empty={
                locale === 'ko' ? '아직 방명록이 없어요.' : 'No guestbook notes yet.'
              }
            >
              {guestbook.length > 0 ? (
                <View style={{ gap: 4 }}>
                  {guestbook.slice(0, 4).map((g) => (
                    <Text key={g.id} style={styles.gbLine} numberOfLines={2}>
                      <Text style={styles.gbAuthor}>
                        {guestbookAuthors[g.authorUserId] ?? '·'} ·{' '}
                      </Text>
                      {g.body}
                    </Text>
                  ))}
                </View>
              ) : null}
            </BoardBlock>

            <View style={styles.linkRow}>
              {circle ? (
                <HardBtn
                  label={locale === 'ko' ? '가명 게시판 →' : 'Alias board →'}
                  onPress={() => router.push(`/circles/${circle.id}/anonymous-board`)}
                />
              ) : null}
              {/* Additive: Spotify slot (web shows placeholder chip) */}
              {music ? (
                <View style={styles.musicWrap}>
                  <DiaryMusicCardView music={music} onOpen={() => onOpenMusic?.()} />
                </View>
              ) : (
                <HardBtn
                  label={`♪ ${locale === 'ko' ? '오늘의 음악 (Spotify)' : "Today’s music (Spotify)"}`}
                  onPress={() => onOpenMusic?.()}
                />
              )}
            </View>

            {!isMine ? (
              <View style={styles.safetyRow}>
                <HardBtn
                  label={t.diary.leaveNote}
                  onPress={() =>
                    router.push({
                      pathname: '/messages/compose',
                      params: { recipientId: owner.id },
                    })
                  }
                />
              </View>
            ) : null}
          </OutlineBox>
        </ScrollView>
      </OutlineBox>
    </View>
  );
}

function BoardBlock({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode;
}) {
  const has = Boolean(children);
  return (
    <View style={styles.boardBlock}>
      <Text style={styles.panelTitle}>{title}</Text>
      {has ? children : <Text style={styles.emptyHint}>{empty}</Text>}
    </View>
  );
}

function HardBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <OutlineBox
        size="sm"
        fill="#FFFFFF"
        stroke={hompy.hard}
        contentStyle={styles.hardBtnInner}
      >
        <Text style={styles.hardBtnText}>{label}</Text>
      </OutlineBox>
    </Pressable>
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
    const row = byDate.get(key);
    return {
      key,
      day: days[i]!,
      n: d.getDate(),
      note: row?.tenCharText?.trim() || '·',
    };
  });
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: hompy.table,
    padding: 8,
  },
  canvasBox: { flex: 1 },
  canvasContent: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    gap: 8,
    padding: 8,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  headerBtn: { minHeight: 36, justifyContent: 'center', minWidth: 72 },
  headerBtnText: { fontSize: 11, fontWeight: '700', color: hompy.ink },
  profilePad: { padding: 12 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarBox: { width: 56, height: 56 },
  avatarInner: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: hompy.ink },
  profileMeta: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '700', color: hompy.ink },
  moodLine: { marginTop: 2, fontSize: 11, color: hompy.muted },
  circleLine: { marginTop: 2, fontSize: 10, color: hompy.soft },
  todayMe: { marginTop: 12 },
  todayMeInner: { padding: 10 },
  todayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: hompy.muted,
    marginBottom: 4,
  },
  todayText: { fontSize: 13, color: hompy.ink, lineHeight: 18 },
  grid2: { flexDirection: 'row', gap: 8 },
  gridCell: { flex: 1, minHeight: 168 },
  panelPad: { padding: 8, flexGrow: 1 },
  panelTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: hompy.muted,
    marginBottom: 6,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(74,63,85,0.18)',
    borderStyle: 'dotted',
    paddingBottom: 3,
    marginBottom: 3,
  },
  weekDay: { width: 14, fontSize: 10, fontWeight: '700', color: hompy.soft },
  weekN: { width: 16, fontSize: 10, color: hompy.ink },
  weekNote: { flex: 1, fontSize: 10, color: hompy.muted },
  albumInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 120,
  },
  albumFrame: { width: 72, height: 72 },
  albumFrameInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumGlyph: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumGlyphOuter: {
    position: 'absolute',
    width: 40,
    height: 28,
    borderWidth: 1.5,
    borderColor: hompy.peachInk,
    borderRadius: 4,
    top: 4,
  },
  albumGlyphInner: {
    width: 22,
    height: 16,
    borderWidth: 1.5,
    borderColor: hompy.peachInk,
    borderRadius: 2,
    opacity: 0.7,
  },
  albumHint: { fontSize: 10, color: hompy.muted, textAlign: 'center' },
  boardPad: { padding: 10, gap: 10 },
  boardBlock: { gap: 2 },
  body: { fontSize: 12, color: hompy.ink, lineHeight: 18 },
  emptyHint: { fontSize: 10, color: hompy.soft },
  gbLine: { fontSize: 11, color: hompy.ink },
  gbAuthor: { color: hompy.soft },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4, alignItems: 'center' },
  musicWrap: { flexGrow: 1, flexBasis: 200 },
  hardBtnInner: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 34,
    justifyContent: 'center',
  },
  hardBtnText: { fontSize: 10, fontWeight: '700', color: hompy.ink },
  safetyRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
});
