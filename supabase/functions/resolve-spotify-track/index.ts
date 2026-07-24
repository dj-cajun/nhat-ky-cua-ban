// Edge Function: resolve-spotify-track
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
  const urlOrUri = typeof body.urlOrUri === 'string' ? body.urlOrUri : '';
  if (!urlOrUri.trim()) {
    return Response.json({ code: 'VALIDATION' }, { status: 400, headers });
  }

  try {
    const track = await resolveSpotifyTrack(urlOrUri);
    if (!track || track.trackName === 'Unknown track') {
      return Response.json({ code: 'NOT_FOUND' }, { status: 404, headers });
    }
    return Response.json({ track }, { headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'UNKNOWN';
    if (msg === 'RATE_LIMITED') {
      return Response.json({ code: 'RATE_LIMITED' }, { status: 429, headers });
    }
    return Response.json({ code: 'SPOTIFY_UNAVAILABLE' }, { status: 503, headers });
  }
});
