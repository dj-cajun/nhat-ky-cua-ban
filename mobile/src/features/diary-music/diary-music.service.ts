import { Linking } from 'react-native';
import { AppError } from '@/types/domain';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  applyDiarySpotifyTrackLocal,
  getDiaryMusicLocal,
  removeDiaryMusicLocal,
  resolveSpotifyTrackLocal,
  searchSpotifyTracksLocal,
} from '@/features/local/repository';
import { isAllowedSpotifyArtworkUrl, parseSpotifyTrackId } from './spotify-url-parser';
import type { DiaryMusicCard, SpotifyTrackSearchResult } from './diary-music.types';

function mapCard(raw: Record<string, unknown>): DiaryMusicCard {
  const artwork =
    typeof raw.artworkUrl === 'string' && isAllowedSpotifyArtworkUrl(raw.artworkUrl)
      ? raw.artworkUrl
      : null;
  return {
    id: String(raw.id),
    diaryEntryId: String(raw.diaryEntryId),
    externalTrackId: String(raw.externalTrackId),
    spotifyUri: String(raw.spotifyUri),
    externalUrl: String(raw.externalUrl),
    trackName: String(raw.trackName),
    artistNames: Array.isArray(raw.artistNames)
      ? (raw.artistNames as string[])
      : [],
    albumName: (raw.albumName as string | null) ?? null,
    artworkUrl: artwork,
    durationMs: typeof raw.durationMs === 'number' ? raw.durationMs : null,
    explicit: Boolean(raw.explicit),
  };
}

export async function searchSpotifyTracks(input: {
  query: string;
  market?: string;
  limit?: number;
}): Promise<SpotifyTrackSearchResult[]> {
  const query = input.query.trim();
  if (query.length < 2 || query.length > 100) {
    throw new AppError('VALIDATION', 'Enter at least 2 characters.');
  }
  if (!isSupabaseConfigured) {
    return searchSpotifyTracksLocal(input);
  }
  const { data, error } = await supabase.functions.invoke('search-spotify-tracks', {
    body: {
      query,
      market: input.market ?? 'US',
      limit: Math.min(input.limit ?? 10, 10),
    },
  });
  if (error) {
    if (String(error.message).includes('429')) {
      throw new AppError('RATE_LIMITED', 'Please try searching again in a moment.');
    }
    throw new AppError('EXTERNAL_SERVICE_FAILED', "Music search isn't available right now.");
  }
  if (data?.code === 'RATE_LIMITED') {
    throw new AppError('RATE_LIMITED', 'Please try searching again in a moment.');
  }
  if (data?.code) {
    throw new AppError('EXTERNAL_SERVICE_FAILED', "Music search isn't available right now.");
  }
  return (data?.items ?? []) as SpotifyTrackSearchResult[];
}

export async function resolveSpotifyTrack(
  urlOrUri: string,
): Promise<SpotifyTrackSearchResult> {
  if (!parseSpotifyTrackId(urlOrUri)) {
    throw new AppError('VALIDATION', "That doesn't look like a Spotify track link.");
  }
  if (!isSupabaseConfigured) {
    const t = await resolveSpotifyTrackLocal(urlOrUri);
    if (!t) throw new AppError('NOT_FOUND', "We couldn't find that Spotify track.");
    return t;
  }
  const { data, error } = await supabase.functions.invoke('resolve-spotify-track', {
    body: { urlOrUri },
  });
  if (error || data?.code === 'NOT_FOUND') {
    throw new AppError('NOT_FOUND', "We couldn't find that Spotify track.");
  }
  if (data?.code === 'RATE_LIMITED') {
    throw new AppError('RATE_LIMITED', 'Please try again in a moment.');
  }
  if (!data?.track) {
    throw new AppError('EXTERNAL_SERVICE_FAILED', "Music lookup isn't available right now.");
  }
  return data.track as SpotifyTrackSearchResult;
}

export async function setDiarySpotifyTrack(input: {
  diaryEntryId: string;
  spotifyTrackId: string;
  actorId: string;
}): Promise<DiaryMusicCard> {
  const id = parseSpotifyTrackId(input.spotifyTrackId);
  if (!id) throw new AppError('VALIDATION', 'Invalid Spotify track.');

  if (!isSupabaseConfigured) {
    const resolved = await resolveSpotifyTrackLocal(id);
    if (!resolved) throw new AppError('NOT_FOUND', "We couldn't find that Spotify track.");
    return applyDiarySpotifyTrackLocal({
      diaryEntryId: input.diaryEntryId,
      actorId: input.actorId,
      track: resolved,
    });
  }

  const { data, error } = await supabase.functions.invoke('set-diary-spotify-track', {
    body: { diaryEntryId: input.diaryEntryId, spotifyTrackId: id },
  });
  if (error || !data?.music) {
    throw new AppError('UNKNOWN', "Couldn't update today's music. Your previous track is unchanged.");
  }
  return mapCard(data.music as Record<string, unknown>);
}

export async function removeDiaryMusic(
  diaryEntryId: string,
  actorId: string,
): Promise<void> {
  if (!isSupabaseConfigured) {
    return removeDiaryMusicLocal(diaryEntryId, actorId);
  }
  const { error } = await supabase.rpc('remove_diary_music', {
    p_diary_entry_id: diaryEntryId,
  });
  if (error) throw new AppError('UNKNOWN', error.message);
  void actorId;
}

export async function getDiaryMusic(
  diaryEntryId: string,
  viewerId: string,
): Promise<DiaryMusicCard | null> {
  if (!isSupabaseConfigured) {
    return getDiaryMusicLocal(diaryEntryId, viewerId);
  }
  const { data, error } = await supabase.rpc('get_diary_music', {
    p_diary_entry_id: diaryEntryId,
  });
  if (error) {
    if (/FORBIDDEN/i.test(error.message)) return null;
    throw new AppError('UNKNOWN', error.message);
  }
  if (!data) return null;
  return mapCard(data as Record<string, unknown>);
}

export async function openSpotifyTrack(track: {
  spotifyUri: string;
  externalUrl: string;
}): Promise<void> {
  try {
    const can = await Linking.canOpenURL(track.spotifyUri);
    if (can) {
      await Linking.openURL(track.spotifyUri);
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    await Linking.openURL(track.externalUrl);
  } catch {
    throw new AppError('EXTERNAL_SERVICE_FAILED', "Couldn't open this track in Spotify.");
  }
}
