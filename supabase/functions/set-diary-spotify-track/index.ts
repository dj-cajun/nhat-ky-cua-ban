// Edge Function: set-diary-spotify-track
// Re-fetches Spotify metadata server-side, then applies via RPC (no client-trusted fields).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, resolveSpotifyTrack } from '../_shared/spotify.ts';

Deno.serve(async (req) => {
  const headers = corsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return Response.json({ code: 'AUTH_REQUIRED' }, { status: 401, headers });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) {
    return Response.json({ code: 'AUTH_REQUIRED' }, { status: 401, headers });
  }

  const body = await req.json().catch(() => ({}));
  const diaryEntryId = typeof body.diaryEntryId === 'string' ? body.diaryEntryId : '';
  const spotifyTrackId = typeof body.spotifyTrackId === 'string' ? body.spotifyTrackId : '';
  if (!diaryEntryId || !spotifyTrackId) {
    return Response.json({ code: 'VALIDATION' }, { status: 400, headers });
  }

  try {
    const track = await resolveSpotifyTrack(spotifyTrackId);
    if (!track || track.id !== spotifyTrackId.replace(/^.*track[:/]/, '')) {
      // allow exact id match after parse
      if (!track) {
        return Response.json({ code: 'NOT_FOUND' }, { status: 404, headers });
      }
    }
    if (!track) {
      return Response.json({ code: 'NOT_FOUND' }, { status: 404, headers });
    }

    const { data, error } = await supabase.rpc('apply_diary_spotify_track', {
      p_diary_entry_id: diaryEntryId,
      p_external_track_id: track.id,
      p_spotify_uri: track.uri,
      p_external_url: track.externalUrl,
      p_track_name: track.trackName,
      p_artist_names: track.artistNames,
      p_album_name: track.albumName,
      p_artwork_url: track.artworkUrl,
      p_duration_ms: track.durationMs,
      p_explicit: track.explicit,
      p_market: null,
    });

    if (error) {
      return Response.json({ code: 'UNKNOWN', message: error.message }, { status: 400, headers });
    }
    return Response.json({ music: data }, { headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'UNKNOWN';
    if (msg === 'RATE_LIMITED') {
      return Response.json({ code: 'RATE_LIMITED' }, { status: 429, headers });
    }
    return Response.json({ code: 'SPOTIFY_UNAVAILABLE' }, { status: 503, headers });
  }
});
