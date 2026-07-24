// Edge Function: search-spotify-tracks
// Spotify client secret stays in Edge env — never in the mobile bundle.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, searchSpotifyTracks } from '../_shared/spotify.ts';

const rate = new Map<string, { windowStart: number; count: number; day: string; dayCount: number }>();

function checkRate(userId: string): boolean {
  const now = Date.now();
  const day = new Date().toISOString().slice(0, 10);
  const row = rate.get(userId) ?? {
    windowStart: now,
    count: 0,
    day,
    dayCount: 0,
  };
  if (row.day !== day) {
    row.day = day;
    row.dayCount = 0;
  }
  if (now - row.windowStart > 60_000) {
    row.windowStart = now;
    row.count = 0;
  }
  row.count += 1;
  row.dayCount += 1;
  rate.set(userId, row);
  return row.count <= 20 && row.dayCount <= 200;
}

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
  if (!checkRate(userData.user.id)) {
    return Response.json({ code: 'RATE_LIMITED' }, { status: 429, headers });
  }

  const body = await req.json().catch(() => ({}));
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  const limit = typeof body.limit === 'number' ? body.limit : 10;
  const market = typeof body.market === 'string' ? body.market.toUpperCase() : undefined;

  if (query.length < 2 || query.length > 100) {
    return Response.json({ code: 'VALIDATION' }, { status: 400, headers });
  }
  if (market && !/^[A-Z]{2}$/.test(market)) {
    return Response.json({ code: 'VALIDATION' }, { status: 400, headers });
  }

  try {
    const items = await searchSpotifyTracks({ query, market, limit });
    return Response.json({ items }, { headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'UNKNOWN';
    if (msg === 'RATE_LIMITED') {
      return Response.json({ code: 'RATE_LIMITED' }, { status: 429, headers });
    }
    return Response.json({ code: 'SPOTIFY_UNAVAILABLE' }, { status: 503, headers });
  }
});
