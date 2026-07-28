import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  AppErrorState,
  AppForbiddenState,
  AppLoadingState,
  OfflineBanner,
} from '@/components/states';
import { DiaryHompyHome, type VisitMember } from '@/features/diary-home';
import { DiaryMusicCardView } from '@/features/diary-music/diary-music-card';
import {
  getDiaryMusic,
  openSpotifyTrack,
  removeDiaryMusic,
  setDiarySpotifyTrack,
} from '@/features/diary-music/diary-music.service';
import type { DiaryMusicCard } from '@/features/diary-music/diary-music.types';
import { SpotifyTrackPicker } from '@/features/diary-music/spotify-track-picker';
import {
  canViewDiary,
  getDiary,
  getProfile,
  getSessionProfile,
  isBlockedBetween,
  listCircleMembers,
  listFreeBoard,
  listGuestbook,
  ensureHompyBoardSeeds,
  listHompyCircleBoardPreview,
  listMyCircleSummaries,
  listRecentDiaryEntries,
  listCorkSlotUris,
  recordFriendDiaryVisit,
  type FreeBoardRow,
  type GuestbookRow,
  type HompyCirclePreview,
  upsertDiary,
} from '@/features/local/repository';
import { blockUser } from '@/features/moderation/block.service';
import { applyConflictChoice } from '@/features/offline-drafts/diary-draft-sync';
import { saveDiaryDraft, type DiaryDraft } from '@/features/offline-drafts/diary-draft.store';
import { invalidateAfterSpotifyChange } from '@/lib/cache-invalidation';
import { toAppError } from '@/lib/errors';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { AnalyticsEvents, track } from '@/lib/logger';
import {
  DIARY_MOODS,
  MAX_TEN_CHAR,
  type CircleSummary,
  type DiaryEntry,
  type DiaryMood,
  type Profile,
} from '@/types/domain';
import { colors } from '@/constants/theme';
import { hompy } from '@/constants/hompy-theme';
import { useMessages, DEFAULT_TIMEZONE, useLocale } from '@/i18n';
import {
  backToCircleGraph,
  resolveCircleGraphId,
} from '@/features/universe-home/circle-visit';

export default function DiaryScreen() {
  const t = useMessages();
  const [locale] = useLocale();
  const { userId, fromCircleId } = useLocalSearchParams<{
    userId: string;
    fromCircleId?: string;
  }>();
  const circleReturnId = resolveCircleGraphId(fromCircleId);
  const [me, setMe] = useState<Profile | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<DiaryEntry[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookRow[]>([]);
  const [guestbookAuthors, setGuestbookAuthors] = useState<Record<string, string>>({});
  const [freeBoard, setFreeBoard] = useState<FreeBoardRow[]>([]);
  const [freeBoardAuthors, setFreeBoardAuthors] = useState<Record<string, string>>({});
  const [circleBoard, setCircleBoard] = useState<{
    circleId: string;
    circleName: string;
  } | null>(null);
  const [circleBoardItems, setCircleBoardItems] = useState<HompyCirclePreview[]>([]);
  const [circles, setCircles] = useState<CircleSummary[]>([]);
  const [visitMembers, setVisitMembers] = useState<VisitMember[]>([]);
  const [canView, setCanView] = useState(true);
  const [music, setMusic] = useState<DiaryMusicCard | null>(null);
  const [corkSlots, setCorkSlots] = useState<Array<string | null>>([null, null, null]);
  const [editing, setEditing] = useState(false);
  const [pickingMusic, setPickingMusic] = useState(false);
  const [mood, setMood] = useState<DiaryMood | undefined>();
  const [ten, setTen] = useState('');
  const [shortText, setShortText] = useState('');
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [blockedRelation, setBlockedRelation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [offline, setOffline] = useState(false);
  const [draftHint, setDraftHint] = useState(false);
  const [conflict, setConflict] = useState<{
    server: DiaryEntry;
    draft: DiaryDraft;
  } | null>(null);
  const saveLock = useRef(false);

  const loadMusic = useCallback(async (entryId: string, viewerId: string) => {
    try {
      setMusic(await getDiaryMusic(entryId, viewerId));
    } catch {
      setMusic(null);
    }
  }, []);

  const loadHompySide = useCallback(async (session: Profile, ownerId: string) => {
    if (session.id === ownerId) {
      try {
        await ensureHompyBoardSeeds(session.id);
      } catch {
        /* ignore seed failures */
      }
    }
    const myCircles = await listMyCircleSummaries(session.id);
    setCircles(myCircles);
    setRecentEntries(await listRecentDiaryEntries(ownerId, 21));

    const seen = new Set<string>();
    const visits: VisitMember[] = [];
    for (const c of myCircles) {
      try {
        const members = await listCircleMembers(c.id, session.id);
        for (const m of members) {
          if (m.userId === session.id || seen.has(m.userId)) continue;
          seen.add(m.userId);
          const p = await getProfile(m.userId);
          if (p) visits.push({ id: p.id, name: p.displayName });
        }
      } catch {
        /* ignore forbidden roster */
      }
    }
    setVisitMembers(visits.slice(0, 8));

    if (session.id === ownerId) {
      try {
        setCorkSlots(await listCorkSlotUris(ownerId));
      } catch {
        setCorkSlots([null, null, null]);
      }
    } else {
      setCorkSlots([null, null, null]);
    }

    try {
      const gb = await listGuestbook(ownerId, session.id);
      setGuestbook(gb.slice(0, 6));
      const authors: Record<string, string> = {};
      for (const g of gb.slice(0, 6)) {
        if (authors[g.authorUserId]) continue;
        const ap = await getProfile(g.authorUserId);
        if (ap) authors[g.authorUserId] = ap.displayName;
      }
      setGuestbookAuthors(authors);
    } catch {
      setGuestbook([]);
    }

    try {
      const fb = await listFreeBoard(ownerId, session.id);
      setFreeBoard(fb.slice(0, 6));
      const authors: Record<string, string> = {};
      for (const p of fb.slice(0, 6)) {
        if (authors[p.authorUserId]) continue;
        const ap = await getProfile(p.authorUserId);
        if (ap) authors[p.authorUserId] = ap.displayName;
      }
      setFreeBoardAuthors(authors);
    } catch {
      setFreeBoard([]);
    }

    try {
      const preview = await listHompyCircleBoardPreview(session.id, ownerId, 3);
      setCircleBoard(preview.circle);
      setCircleBoardItems(preview.items);
    } catch {
      setCircleBoard(null);
      setCircleBoardItems([]);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const session = await getSessionProfile();
        if (!session || !userId) {
          router.replace('/(auth)/sign-in');
          return;
        }
        setMe(session);
        if (await isBlockedBetween(session.id, userId)) {
          setBlockedRelation(true);
          setOwner(await getProfile(userId));
          return;
        }
        setOwner(await getProfile(userId));
        const d = await getDiary(userId);
        setEntry(d);
        let viewable = true;
        if (d) {
          if (!(await canViewDiary(session.id, userId, d)) && session.id !== userId) {
            setBlocked(true);
            viewable = false;
          } else {
            await loadMusic(d.id, session.id);
            track(AnalyticsEvents.diary_viewed, { market: 'US' });
            if (session.id !== userId) {
              void recordFriendDiaryVisit();
            }
          }
          setMood(d.mood ?? undefined);
          setTen(d.tenCharText ?? '');
          setShortText(d.shortText ?? '');
        }
        setCanView(viewable || session.id === userId);
        await loadHompySide(session, userId);
      } catch (e) {
        const app = toAppError(e);
        if (app.code === 'OFFLINE') setOffline(true);
        setError(app.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, loadMusic, loadHompySide]);

  useFocusEffect(
    useCallback(() => {
      if (!me || !userId || me.id !== userId) return;
      void listCorkSlotUris(userId)
        .then(setCorkSlots)
        .catch(() => setCorkSlots([null, null, null]));
    }, [me, userId]),
  );

  const isMine = me?.id === userId;
  const moodMeta = DIARY_MOODS.find((m) => m.id === (entry?.mood ?? mood));

  const persistLocalDraft = async () => {
    if (!me || !isMine) return;
    const entryDate = entry?.entryDate ?? new Date().toISOString().slice(0, 10);
    await saveDiaryDraft({
      userId: me.id,
      entryDate,
      timezone: entry?.timezone ?? DEFAULT_TIMEZONE,
      mood,
      tenCharText: ten.trim() || undefined,
      shortText: shortText.trim() || undefined,
      visibilityMode: entry?.visibilityMode ?? 'private',
      status: 'draft',
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: entry?.updatedAt,
    });
    setDraftHint(true);
  };

  const save = async () => {
    if (!me || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setError('');
    setConflict(null);
    try {
      const saved = await upsertDiary({
        userId: me.id,
        mood,
        tenCharText: ten.trim() || undefined,
        shortText: shortText.trim() || undefined,
        visibilityMode: 'private',
        expectedUpdatedAt: entry?.updatedAt,
      });
      setEntry(saved);
      setEditing(false);
      setPickingMusic(false);
      setDraftHint(false);
      await loadMusic(saved.id, me.id);
      try {
        setRecentEntries(await listRecentDiaryEntries(me.id, 21));
      } catch {
        /* keep prior week strip */
      }
      try {
        setCorkSlots(await listCorkSlotUris(me.id));
      } catch {
        /* keep prior cork */
      }
      track(AnalyticsEvents.diary_saved, {
        has_photo: corkSlots.some(Boolean),
        has_music: Boolean(music),
        market: 'US',
      });
    } catch (e) {
      const app = toAppError(e);
      if (app.code === 'OFFLINE') {
        setOffline(true);
        await persistLocalDraft();
        setError(t.errors.offline);
      } else if (app.code === 'CONFLICT') {
        await persistLocalDraft();
        const server = await getDiary(me.id);
        if (server) {
          setConflict({
            server,
            draft: {
              userId: me.id,
              entryDate: server.entryDate,
              timezone: server.timezone,
              mood,
              tenCharText: ten.trim() || undefined,
              shortText: shortText.trim() || undefined,
              visibilityMode: 'private',
              status: 'failed',
              updatedAt: new Date().toISOString(),
              serverUpdatedAt: entry?.updatedAt,
            },
          });
        }
        setError(t.diary.conflictTitle);
      } else {
        await persistLocalDraft();
        setError(app.message);
      }
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const onSelectTrack = async (trackResult: { id: string }) => {
    if (!me || !isFeatureEnabled('spotify_search_enabled')) return;
    setError('');
    try {
      let diary = entry;
      if (!diary) {
        diary = await upsertDiary({
          userId: me.id,
          mood,
          tenCharText: ten.trim() || undefined,
          shortText: shortText.trim() || undefined,
          visibilityMode: 'private',
        });
        setEntry(diary);
      }
      const saved = await setDiarySpotifyTrack({
        diaryEntryId: diary.id,
        spotifyTrackId: trackResult.id,
        actorId: me.id,
      });
      setMusic(saved);
      setPickingMusic(false);
      await invalidateAfterSpotifyChange({
        ownerUserId: me.id,
        entryId: diary.id,
        entryDate: diary.entryDate,
      });
      track(AnalyticsEvents.spotify_track_saved, { market: 'US' });
    } catch (e) {
      const app = toAppError(e);
      setError(
        app.code === 'EXTERNAL_SERVICE_FAILED'
          ? t.diaryMusic.serviceDown
          : app.message || t.diaryMusic.saveFailed,
      );
    }
  };

  const onRemoveMusic = async () => {
    if (!me || !entry) return;
    try {
      await removeDiaryMusic(entry.id, me.id);
      setMusic(null);
      await invalidateAfterSpotifyChange({
        ownerUserId: me.id,
        entryId: entry.id,
        entryDate: entry.entryDate,
      });
      track('diary_music_removed', { market: 'US' });
    } catch (e) {
      setError(toAppError(e).message);
    }
  };

  const onOpenMusic = async () => {
    if (!music) {
      if (isMine) {
        setEditing(true);
        setPickingMusic(true);
      }
      return;
    }
    try {
      await openSpotifyTrack(music);
      track('diary_music_opened_in_spotify', { market: 'US' });
    } catch (e) {
      setError(toAppError(e).message || t.diaryMusic.openFailed);
    }
  };

  const openAlbum = () => {
    if (!userId) return;
    router.push({
      pathname: '/diary/[userId]/album',
      params: { userId },
    });
  };

  const openCalendar = () => {
    if (!userId) return;
    router.push({
      pathname: '/diary/[userId]/calendar',
      params: { userId },
    });
  };

  if (loading && !owner) {
    return (
      <SafeAreaView style={styles.hompySafe}>
        <AppLoadingState />
      </SafeAreaView>
    );
  }

  if (!owner) {
    return (
      <SafeAreaView style={styles.hompySafe}>
        <AppErrorState code="NOT_FOUND" />
      </SafeAreaView>
    );
  }

  if (blockedRelation || blocked) {
    return (
      <SafeAreaView style={styles.hompySafe}>
        <AppForbiddenState
          title={t.diary.privateBlocked}
          actionLabel={t.diary.back}
          onAction={() => backToCircleGraph(fromCircleId)}
        />
      </SafeAreaView>
    );
  }

  // Pastel mini-hompy (+ today’s scene strip). Edit form keeps the same shell.
  if (!editing && me) {
    return (
      <SafeAreaView style={styles.hompySafe} edges={['top', 'left', 'right']}>
        <OfflineBanner
          visible={offline || draftHint}
          message={draftHint ? t.diary.draftSaved : undefined}
        />
        {error ? <AppErrorState message={error} /> : null}
        <DiaryHompyHome
          me={me}
          owner={owner}
          entry={entry}
          recentEntries={recentEntries}
          guestbook={guestbook}
          guestbookAuthors={guestbookAuthors}
          freeBoard={freeBoard}
          freeBoardAuthors={freeBoardAuthors}
          circleBoard={circleBoard}
          circleBoardItems={circleBoardItems}
          circles={circles}
          visitMembers={visitMembers}
          music={music}
          canView={canView}
          corkSlots={corkSlots}
          onEditToday={() => setEditing(true)}
          onOpenAlbum={openAlbum}
          onOpenCalendar={openCalendar}
          onOpenMusic={() => void onOpenMusic()}
          fromCircleId={circleReturnId ?? undefined}
          backLabel={
            circleReturnId
              ? circles.find((c) => c.id === circleReturnId)?.name ??
                (locale === 'ko' ? '서클' : 'Circle')
              : undefined
          }
          onBack={() => backToCircleGraph(fromCircleId)}
        />
        {!isMine ? (
          <View style={styles.hompySafety}>
            <Pressable
              style={styles.report}
              onPress={() =>
                router.push({
                  pathname: '/reports/create',
                  params: {
                    targetType: 'profile',
                    targetId: userId,
                    targetUserId: userId,
                  },
                })
              }
            >
              <Text style={styles.reportText}>{t.reports.reportProfile}</Text>
            </Pressable>
            <Pressable
              style={styles.report}
              onPress={() =>
                void (async () => {
                  await blockUser(me.id, userId);
                  track(AnalyticsEvents.block_created, { market: 'US' });
                  backToCircleGraph(fromCircleId);
                })()
              }
            >
              <Text style={styles.reportText}>{t.reports.blockUser}</Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.hompySafe}>
      <OfflineBanner
        visible={offline || draftHint}
        message={draftHint ? t.diary.draftSaved : undefined}
      />
      <ScrollView contentContainerStyle={styles.editCanvas}>
        <Pressable
          onPress={() => setEditing(false)}
          accessibilityRole="button"
          style={styles.backRow}
        >
          <Text style={styles.back}>{t.diary.back}</Text>
        </Pressable>
        <Text style={styles.title}>{owner.displayName}</Text>
        <Text style={styles.mood}>
          {moodMeta ? `${moodMeta.emoji} ${moodMeta.label}` : t.diary.noMood}
        </Text>

        {conflict ? (
          <View style={styles.conflict}>
            <Text style={styles.conflictTitle}>{t.diary.conflictTitle}</Text>
            <Pressable
              style={styles.link}
              onPress={() =>
                void (async () => {
                  const kept = await applyConflictChoice({
                    choice: 'keep_server',
                    userId: me!.id,
                    entryDate: conflict.server.entryDate,
                    server: conflict.server,
                    draft: conflict.draft,
                  });
                  if (kept) {
                    setEntry(kept);
                    setMood(kept.mood ?? undefined);
                    setTen(kept.tenCharText ?? '');
                    setShortText(kept.shortText ?? '');
                  }
                  setConflict(null);
                  setEditing(false);
                })()
              }
            >
              <Text>{t.diary.conflictServer}</Text>
            </Pressable>
            <Pressable
              style={styles.link}
              onPress={() =>
                void (async () => {
                  const overwritten = await applyConflictChoice({
                    choice: 'overwrite_with_local',
                    userId: me!.id,
                    entryDate: conflict.server.entryDate,
                    server: conflict.server,
                    draft: conflict.draft,
                  });
                  if (overwritten) setEntry(overwritten);
                  setConflict(null);
                  setEditing(false);
                })()
              }
            >
              <Text>{t.diary.conflictOverwrite}</Text>
            </Pressable>
          </View>
        ) : null}

        {isMine ? (
          <View>
            <Text style={styles.label}>{t.diary.mood}</Text>
            <View style={styles.moodRow}>
              {DIARY_MOODS.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setMood(m.id)}
                  style={[styles.chip, mood === m.id && styles.chipOn]}
                  accessibilityRole="button"
                  accessibilityLabel={m.label}
                >
                  <Text style={{ fontSize: 12 }}>{m.emoji}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>
              {t.diary.tenChar} ({ten.length}/{MAX_TEN_CHAR})
            </Text>
            <TextInput
              value={ten}
              onChangeText={(v) => {
                setTen(v);
                void persistLocalDraft();
              }}
              maxLength={MAX_TEN_CHAR}
              style={styles.input}
              placeholderTextColor={colors.soft}
            />
            <Text style={styles.label}>{t.diary.shortText}</Text>
            <TextInput
              value={shortText}
              onChangeText={(v) => {
                setShortText(v);
                void persistLocalDraft();
              }}
              maxLength={280}
              multiline
              style={[styles.input, { minHeight: 100 }]}
              placeholderTextColor={colors.soft}
            />

            <Text style={styles.label}>{t.diary.musicSection}</Text>
            {!isFeatureEnabled('spotify_search_enabled') ? (
              <Text style={styles.empty}>{t.circle.featureDisabled}</Text>
            ) : music && !pickingMusic ? (
              <>
                <DiaryMusicCardView music={music} onOpen={() => void onOpenMusic()} />
                <Pressable style={styles.link} onPress={() => setPickingMusic(true)}>
                  <Text>{t.diaryMusic.change}</Text>
                </Pressable>
                <Pressable style={styles.link} onPress={() => void onRemoveMusic()}>
                  <Text>{t.diaryMusic.remove}</Text>
                </Pressable>
              </>
            ) : pickingMusic ? (
              <SpotifyTrackPicker
                onSelect={(tr) => void onSelectTrack(tr)}
                onCancel={() => setPickingMusic(false)}
              />
            ) : (
              <Pressable style={styles.link} onPress={() => setPickingMusic(true)}>
                <Text>{t.diaryMusic.add}</Text>
              </Pressable>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.btn, saving && { opacity: 0.6 }]}
              onPress={() => void save()}
              disabled={saving}
              accessibilityRole="button"
              accessibilityState={{ busy: saving }}
            >
              <Text style={styles.btnText}>{t.diary.save}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hompySafe: { flex: 1, backgroundColor: hompy.table },
  hompySafety: { paddingHorizontal: 16, paddingBottom: 8 },
  editCanvas: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: hompy.canvas,
    margin: 8,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(139,122,158,0.25)',
  },
  backRow: { minHeight: 44, justifyContent: 'center' },
  back: { color: colors.muted },
  title: { fontSize: 24, fontWeight: '600', color: colors.ink },
  mood: { marginTop: 6, color: colors.muted, marginBottom: 16 },
  label: { fontSize: 11, color: colors.accent, marginBottom: 6, marginTop: 8 },
  empty: { color: colors.soft, marginVertical: 16 },
  moodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
    color: colors.ink,
    backgroundColor: colors.card,
    marginBottom: 4,
  },
  btn: {
    marginTop: 16,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600' },
  link: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    padding: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  report: { marginTop: 4, padding: 10, minHeight: 40, justifyContent: 'center' },
  reportText: { color: colors.warn, fontSize: 13 },
  error: { color: colors.warn, marginTop: 8 },
  conflict: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warn,
    backgroundColor: colors.card,
  },
  conflictTitle: { color: colors.warn, fontWeight: '600', marginBottom: 4 },
});
