import { router, useLocalSearchParams } from 'expo-router';
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
  AppEmptyState,
  AppErrorState,
  AppForbiddenState,
  AppLoadingState,
  OfflineBanner,
} from '@/components/states';
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
  type DiaryEntry,
  type DiaryMood,
  type Profile,
} from '@/types/domain';
import { colors } from '@/constants/theme';
import { useMessages, DEFAULT_TIMEZONE } from '@/i18n';
export default function DiaryScreen() {
  const t = useMessages();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [me, setMe] = useState<Profile | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [entry, setEntry] = useState<DiaryEntry | null>(null);
  const [music, setMusic] = useState<DiaryMusicCard | null>(null);
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
        if (d) {
          if (!(await canViewDiary(session.id, userId, d)) && session.id !== userId) {
            setBlocked(true);
          } else {
            await loadMusic(d.id, session.id);
            track(AnalyticsEvents.diary_viewed, { market: 'US' });
          }
          setMood(d.mood ?? undefined);
          setTen(d.tenCharText ?? '');
          setShortText(d.shortText ?? '');
        }
      } catch (e) {
        const app = toAppError(e);
        if (app.code === 'OFFLINE') setOffline(true);
        setError(app.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, loadMusic]);

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
      track(AnalyticsEvents.diary_saved, {
        has_photo: false,
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
    if (!music) return;
    try {
      await openSpotifyTrack(music);
      track('diary_music_opened_in_spotify', { market: 'US' });
    } catch (e) {
      setError(toAppError(e).message || t.diaryMusic.openFailed);
    }
  };

  if (loading && !owner) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppLoadingState />
      </SafeAreaView>
    );
  }

  if (!owner) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppErrorState code="NOT_FOUND" />
      </SafeAreaView>
    );
  }

  if (blockedRelation || blocked) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppForbiddenState
          title={t.diary.privateBlocked}
          actionLabel={t.diary.back}
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <OfflineBanner
        visible={offline || draftHint}
        message={draftHint ? t.diary.draftSaved : undefined}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
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

        {editing && isMine ? (
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
                onSelect={(t) => void onSelectTrack(t)}
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
        ) : (
          <View>
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
            {music ? (
              <DiaryMusicCardView music={music} onOpen={() => void onOpenMusic()} />
            ) : isMine ? (
              <Text style={styles.empty}>{t.diary.emptyMusic}</Text>
            ) : null}
            {!entry ? (
              <AppEmptyState
                title={isMine ? t.diary.emptyToday : t.diary.emptyOther}
                subtitle={isMine ? t.diary.emptyTodaySub : undefined}
              />
            ) : null}
            {error ? <AppErrorState message={error} /> : null}
          </View>
        )}

        {isMine && !editing ? (
          <Pressable
            style={styles.btn}
            onPress={() => setEditing(true)}
            accessibilityRole="button"
          >
            <Text style={styles.btnText}>{t.diary.editToday}</Text>
          </Pressable>
        ) : null}

        <>
          <Pressable style={styles.link} onPress={() => router.push(`/diary/${userId}/guestbook`)}>
            <Text>{t.diary.guestbook}</Text>
          </Pressable>
          <Pressable style={styles.link} onPress={() => router.push(`/diary/${userId}/calendar`)}>
            <Text>{t.diary.past}</Text>
          </Pressable>
          <Pressable style={styles.link} onPress={() => router.push(`/diary/${userId}/album`)}>
            <Text>{t.diary.album}</Text>
          </Pressable>
        </>

        {!isMine && me ? (
          <>
            <Pressable
              style={styles.link}
              onPress={() =>
                router.push({
                  pathname: '/messages/compose',
                  params: { recipientId: userId },
                })
              }
            >
              <Text>{t.diary.leaveNote}</Text>
            </Pressable>
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
                  router.replace('/(tabs)/universe');
                })()
              }
            >
              <Text style={styles.reportText}>{t.reports.blockUser}</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  back: { color: colors.muted, marginBottom: 12, minHeight: 44 },
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
  report: { marginTop: 10, padding: 12, minHeight: 44, justifyContent: 'center' },
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
