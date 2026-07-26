import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DiaryMusicCard } from '@/features/diary-music/diary-music.types';
import type {
  FreeBoardRow,
  GuestbookRow,
  HompyCirclePreview,
} from '@/features/local/repository';
import { SceneArt } from '@/features/e2-prototype/SceneArt';
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
 * E3 diary space — one emotional scene first (not pastel card grids).
 * Friend = warm window; mine = cool desk. Objects stay secondary.
 */
export function DiaryHompyHome({
  me,
  owner,
  entry,
  guestbook,
  freeBoard,
  circleBoard,
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
  const palette = isMine ? MY : FRIEND;
  const moodMeta = DIARY_MOODS.find((m) => m.id === entry?.mood);
  const sentence = canView
    ? entry?.shortText?.trim() ||
      entry?.tenCharText?.trim() ||
      (isMine ? t.diary.emptyToday : t.diary.emptyOther)
    : t.diary.privateBlocked;
  const moodLabel = moodMeta
    ? `${moodMeta.emoji} ${moodMeta.label}`
    : t.diary.noMood;
  const musicLabel = music
    ? `${music.trackName}${
        music.artistNames?.length ? ` · ${music.artistNames.join(', ')}` : ''
      }`
    : locale === 'ko'
      ? '오늘의 음악'
      : "Today’s music";
  const photoLabel = isMine
    ? locale === 'ko'
      ? '내 책상 모서리'
      : 'my desk corner'
    : locale === 'ko'
      ? '오후 창'
      : 'afternoon window';

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
    <View style={[styles.shell, { backgroundColor: palette.washEdge }]}>
      <View style={[styles.wash, { backgroundColor: palette.wash }]} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          style={styles.back}
          hitSlop={8}
        >
          <Text style={[styles.backText, { color: palette.muted }]}>
            ← {resolvedBackLabel}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (isMine) onEditToday();
          }}
          accessibilityRole={isMine ? 'button' : 'summary'}
          accessibilityLabel={
            isMine
              ? locale === 'ko'
                ? '오늘 일기 쓰기'
                : 'Edit today’s diary scene'
              : `${owner.displayName}'s diary today`
          }
          disabled={!isMine}
          style={({ pressed }) => [pressed && isMine && { opacity: 0.92 }]}
        >
          <View style={[styles.photo, { backgroundColor: palette.scene }]}>
            <SceneArt variant={isMine ? 'myDesk' : 'friendWindow'} />
            <View style={styles.photoScrim} />
            <Text style={[styles.photoLabel, { color: palette.ink }]}>{photoLabel}</Text>
          </View>
        </Pressable>

        <Text style={[styles.owner, { color: palette.muted }]}>
          {owner.displayName.toUpperCase()} · TODAY
        </Text>
        <Text style={[styles.sentence, { color: palette.ink }]}>{sentence}</Text>
        <Text style={[styles.mood, { color: palette.mood }]}>{moodLabel}</Text>

        <Pressable
          style={[styles.music, { backgroundColor: palette.musicBar }]}
          onPress={() => onOpenMusic?.()}
          accessibilityRole="button"
          accessibilityLabel={musicLabel}
        >
          <Text style={[styles.musicText, { color: palette.ink }]}>♪  {musicLabel}</Text>
        </Pressable>

        {isMine ? (
          <Text style={[styles.hint, { color: palette.muted }]}>
            {locale === 'ko' ? '장면을 눌러 오늘을 쓰세요' : 'tap the scene to write today'}
          </Text>
        ) : null}

        <View style={styles.objects}>
          <ObjectChip
            label={locale === 'ko' ? '사진첩' : 'album'}
            palette={palette}
            onPress={() =>
              router.push({
                pathname: '/diary/[userId]/album',
                params: { userId: owner.id },
              })
            }
          />
          <ObjectChip
            label={locale === 'ko' ? '편지' : 'letters'}
            palette={palette}
            onPress={() =>
              router.push({
                pathname: '/diary/[userId]/guestbook',
                params: { userId: owner.id },
              })
            }
          />
          <ObjectChip
            label={locale === 'ko' ? '하루' : 'days'}
            palette={palette}
            onPress={() =>
              router.push({
                pathname: '/diary/[userId]/calendar',
                params: { userId: owner.id },
              })
            }
          />
          {isMine ? (
            <ObjectChip
              label={locale === 'ko' ? '집중' : 'focus'}
              palette={palette}
              tomato
              onPress={() => {
                /* E5: focus room */
              }}
            />
          ) : null}
          {circleBoard ? (
            <ObjectChip
              label={locale === 'ko' ? '보드' : 'board'}
              palette={palette}
              onPress={() =>
                router.push(`/circles/${circleBoard.circleId}/anonymous-board`)
              }
            />
          ) : null}
        </View>

        {!isMine ? (
          <Pressable
            style={styles.noteBtn}
            onPress={() =>
              router.push({
                pathname: '/messages/compose',
                params: { recipientId: owner.id },
              })
            }
            accessibilityRole="button"
          >
            <Text style={[styles.noteBtnText, { color: palette.ink }]}>
              {t.diary.leaveNote}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.noteBtn}
            onPress={onEditToday}
            accessibilityRole="button"
          >
            <Text style={[styles.noteBtnText, { color: palette.ink }]}>
              {t.diary.editToday}
            </Text>
          </Pressable>
        )}

        {/* Keep free-board reachable without dominating the scene */}
        {freeBoard.length > 0 || guestbook.length > 0 ? (
          <Text style={[styles.metaQuiet, { color: palette.muted }]}>
            {locale === 'ko'
              ? '편지·보드 글은 오브제로 이어집니다'
              : 'letters & boards stay in the objects'}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

type DiaryPalette = {
  wash: string;
  washEdge: string;
  scene: string;
  ink: string;
  muted: string;
  mood: string;
  musicBar: string;
  object: string;
  objectBorder: string;
};

function ObjectChip({
  label,
  palette,
  onPress,
  tomato,
}: {
  label: string;
  palette: DiaryPalette;
  onPress: () => void;
  tomato?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.object,
        {
          backgroundColor: tomato ? 'rgba(212,106,92,0.22)' : palette.object,
          borderColor: tomato ? '#D46A5C' : palette.objectBorder,
        },
      ]}
    >
      <Text style={[styles.objectText, { color: palette.ink }]}>{label}</Text>
    </Pressable>
  );
}

const FRIEND = {
  wash: '#241820',
  washEdge: '#140E14',
  scene: '#3A2430',
  ink: '#F8EDE8',
  muted: 'rgba(248,237,232,0.72)',
  mood: '#E8B4A0',
  musicBar: 'rgba(248,237,232,0.16)',
  object: 'rgba(248,237,232,0.12)',
  objectBorder: 'rgba(248,237,232,0.26)',
} as const;

const MY = {
  wash: '#152028',
  washEdge: '#0C141A',
  scene: '#1E3340',
  ink: '#EAF3F6',
  muted: 'rgba(234,243,246,0.72)',
  mood: '#9FCBD8',
  musicBar: 'rgba(234,243,246,0.16)',
  object: 'rgba(234,243,246,0.12)',
  objectBorder: 'rgba(234,243,246,0.26)',
} as const;

const styles = StyleSheet.create({
  shell: { flex: 1 },
  wash: { ...StyleSheet.absoluteFill, opacity: 0.95 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  back: { minHeight: 44, justifyContent: 'center', marginBottom: 4 },
  backText: { fontSize: 13, fontWeight: '500' },
  photo: {
    width: '100%',
    aspectRatio: 0.92,
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 18,
    marginTop: 4,
  },
  photoScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '38%',
    backgroundColor: 'rgba(10,8,12,0.42)',
  },
  photoLabel: {
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '500',
    zIndex: 2,
  },
  owner: {
    marginTop: 18,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '500',
  },
  sentence: {
    marginTop: 10,
    fontSize: 26,
    lineHeight: 34,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  mood: { marginTop: 12, fontSize: 15, fontWeight: '600' },
  music: {
    marginTop: 16,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  musicText: { fontSize: 13 },
  hint: { marginTop: 14, fontSize: 13 },
  objects: {
    marginTop: 28,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  object: {
    minWidth: 80,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  objectText: { fontSize: 13, fontWeight: '500' },
  noteBtn: {
    marginTop: 24,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  noteBtnText: { fontSize: 14, fontWeight: '500', textDecorationLine: 'underline' },
  metaQuiet: { marginTop: 16, fontSize: 11 },
});
