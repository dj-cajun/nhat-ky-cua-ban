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
import type {
  FreeBoardRow,
  GuestbookRow,
  HompyCirclePreview,
} from '@/features/local/repository';
import { DeskScene } from '@/features/diary-home/desk-scene';
import { HompyBoardStack } from '@/features/diary-home/hompy-board-stack';
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
  freeBoard: FreeBoardRow[];
  freeBoardAuthors: Record<string, string>;
  circleBoard: {
    circleId: string;
    circleName: string;
  } | null;
  circleBoardItems: HompyCirclePreview[];
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
  freeBoard,
  freeBoardAuthors,
  circleBoard,
  circleBoardItems,
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

  const boardSections = useMemo(
    () => [
      {
        key: 'circle',
        title: locale === 'ko' ? '써클게시판' : 'Circle board',
        titleTone: 'circle' as const,
        visible: Boolean(circleBoard),
        empty:
          locale === 'ko'
            ? '아직 써클 글이 없어요.'
            : 'No circle posts yet.',
        lines: circleBoardItems.map((p) => ({
          id: p.id,
          authorLabel: p.aliasName,
          body: p.body,
        })),
        onOpen: () => {
          if (!circleBoard) return;
          router.push(`/circles/${circleBoard.circleId}/anonymous-board`);
        },
      },
      {
        key: 'guestbook',
        title: locale === 'ko' ? '방명록' : 'Guestbook',
        titleTone: 'guestbook' as const,
        visible: true,
        empty:
          locale === 'ko' ? '아직 방명록이 없어요.' : 'No guestbook notes yet.',
        lines: guestbook.slice(0, 3).map((g) => ({
          id: g.id,
          authorLabel: guestbookAuthors[g.authorUserId] ?? '·',
          body: g.body,
        })),
        onOpen: () =>
          router.push({
            pathname: '/diary/[userId]/guestbook',
            params: { userId: owner.id },
          }),
      },
      {
        key: 'free',
        title: locale === 'ko' ? '자유게시판' : 'Free board',
        titleTone: 'free' as const,
        visible: true,
        empty:
          locale === 'ko' ? '아직 자유게시판 글이 없어요.' : 'No free-board posts yet.',
        lines: freeBoard.slice(0, 3).map((p) => ({
          id: p.id,
          authorLabel: freeBoardAuthors[p.authorUserId] ?? '·',
          body: p.body,
        })),
        onOpen: () =>
          router.push({
            pathname: '/diary/[userId]/free-board',
            params: { userId: owner.id },
          }),
      },
    ],
    [
      locale,
      circleBoard,
      circleBoardItems,
      guestbook,
      guestbookAuthors,
      freeBoard,
      freeBoardAuthors,
      owner.id,
    ],
  );

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

            {!isMine ? (
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
                      t.diary.emptyOther
                    : t.diary.privateBlocked}
                </Text>
              </OutlineBox>
            ) : null}
          </OutlineBox>

          {/* MY: DeskScene replaces Today I… + mini album. Friend: pastel slots. */}
          {isMine ? (
            <OutlineBox
              fill="#2A2430"
              stroke={hompy.pencilBold}
              contentStyle={styles.deskPad}
            >
              <DeskScene
                memoText={
                  canView
                    ? entry?.tenCharText?.trim() || entry?.shortText?.trim() || undefined
                    : undefined
                }
                onPressMemo={onEditToday}
                onPressCork={onEditToday}
                onPressFrame={onEditToday}
              />
            </OutlineBox>
          ) : null}

          {/* Calendar | Album — friend keeps album; mine calendar only under desk */}
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

            {!isMine ? (
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
            ) : null}
          </View>

          {/* School-style boards — circle / guestbook / free */}
          <OutlineBox
            fill={hompy.lavender}
            stroke={hompy.lavenderInk}
            contentStyle={styles.boardPad}
          >
            <HompyBoardStack sections={boardSections} locale={locale} />

            <View style={styles.linkRow}>
              {/* Additive: Spotify slot */}
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
  deskPad: { padding: 6 },
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
  boardPad: { padding: 8, gap: 10 },
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
