// Shared Spotify helpers for Edge Functions.
// Secrets: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET (never in the mobile bundle).

export type NormalizedTrack = {
  id: string;
  uri: string;
  externalUrl: string;
  trackName: string;
  artistNames: string[];
  albumName: string | null;
  artworkUrl: string | null;
  durationMs: number;
  explicit: boolean;
};

const DEMO_CATALOG: NormalizedTrack[] = [
  {
    id: 'demoTrackSeasons',
    uri: 'spotify:track:demoTrackSeasons',
    externalUrl: 'https://open.spotify.com/track/demoTrackSeasons',
    trackName: 'seasons',
    artistNames: ['wave to earth'],
    albumName: 'summer flies',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273demo0001',
    durationMs: 240000,
    explicit: false,
  },
  {
    id: 'demoTrackQuiet',
    uri: 'spotify:track:demoTrackQuiet',
    externalUrl: 'https://open.spotify.com/track/demoTrackQuiet',
    trackName: 'Quiet Morning',
    artistNames: ['Demo Artist'],
    albumName: 'Soft Days',
    artworkUrl: null,
    durationMs: 198000,
    explicit: false,
  },
  {
    id: 'demoTrackNight',
    uri: 'spotify:track:demoTrackNight',
    externalUrl: 'https://open.spotify.com/track/demoTrackNight',
    trackName: 'Night Walk',
    artistNames: ['Harbor Lights'],
    albumName: 'City Notes',
    artworkUrl: 'https://i.scdn.co/image/ab67616d0000b273demo0002',
    durationMs: 212000,
    explicit: true,
  },
];

export function parseSpotifyTrackId(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  if (/\/(album|artist|playlist|episode|show)\//i.test(v)) return null;
  const uri = v.match(/spotify:track:([A-Za-z0-9]+)/i);
  if (uri) return uri[1];
  const url = v.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/i);
  if (url) return url[1];
  if (/^[A-Za-z0-9]{10,30}$/.test(v)) return v;
  return null;
}

let cachedToken: { value: string; exp: number } | null = null;

async function getSpotifyAccessToken(): Promise<string | null> {
  const id = Deno.env.get('SPOTIFY_CLIENT_ID');
  const secret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  if (!id || !secret) return null;
  if (cachedToken && cachedToken.exp > Date.now() + 30_000) return cachedToken.value;

  const basic = btoa(`${id}:${secret}`);
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) return null;
  const json = await res.json();
  cachedToken = {
    value: json.access_token as string,
    exp: Date.now() + (Number(json.expires_in) || 3600) * 1000,
  };
  return cachedToken.value;
}

function normalizeSpotifyTrack(raw: Record<string, unknown>): NormalizedTrack {
  const album = (raw.album ?? {}) as Record<string, unknown>;
  const images = (album.images ?? []) as { url?: string }[];
  const artists = ((raw.artists ?? []) as { name?: string }[])
    .map((a) => a.name)
    .filter((n): n is string => Boolean(n));
  const ext = (raw.external_urls ?? {}) as { spotify?: string };
  return {
    id: String(raw.id),
    uri: String(raw.uri),
    externalUrl: ext.spotify ?? `https://open.spotify.com/track/${raw.id}`,
    trackName: String(raw.name ?? ''),
    artistNames: artists.length ? artists : ['Unknown'],
    albumName: album.name ? String(album.name) : null,
    artworkUrl: images[0]?.url && images[0].url.startsWith('https://') ? images[0].url : null,
    durationMs: Number(raw.duration_ms ?? 0),
    explicit: Boolean(raw.explicit),
  };
}

export async function searchSpotifyTracks(input: {
  query: string;
  market?: string;
  limit?: number;
}): Promise<NormalizedTrack[]> {
  const q = input.query.trim();
  const limit = Math.max(1, Math.min(input.limit ?? 10, 10));
  const token = await getSpotifyAccessToken();
  if (!token) {
    const lower = q.toLowerCase();
    return DEMO_CATALOG.filter(
      (t) =>
        t.trackName.toLowerCase().includes(lower) ||
        t.artistNames.some((a) => a.toLowerCase().includes(lower)),
    ).slice(0, limit);
  }

  const params = new URLSearchParams({
    q,
    type: 'track',
    limit: String(limit),
  });
  if (input.market && /^[A-Z]{2}$/.test(input.market)) {
    params.set('market', input.market);
  }
  const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 429) {
    const err = new Error('RATE_LIMITED');
    (err as Error & { code: string }).code = 'RATE_LIMITED';
    throw err;
  }
  if (!res.ok) throw new Error('SPOTIFY_UNAVAILABLE');
  const json = await res.json();
  const items = (json.tracks?.items ?? []) as Record<string, unknown>[];
  return items.map(normalizeSpotifyTrack);
}

export async function resolveSpotifyTrack(
  urlOrUri: string,
): Promise<NormalizedTrack | null> {
  const id = parseSpotifyTrackId(urlOrUri);
  if (!id) return null;
  const token = await getSpotifyAccessToken();
  if (!token) {
    return DEMO_CATALOG.find((t) => t.id === id) ?? {
      id,
      uri: `spotify:track:${id}`,
      externalUrl: `https://open.spotify.com/track/${id}`,
      trackName: 'Unknown track',
      artistNames: ['Unknown'],
      albumName: null,
      artworkUrl: null,
      durationMs: 0,
      explicit: false,
    };
  }
  const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (res.status === 429) {
    const err = new Error('RATE_LIMITED');
    (err as Error & { code: string }).code = 'RATE_LIMITED';
    throw err;
  }
  if (!res.ok) throw new Error('SPOTIFY_UNAVAILABLE');
  return normalizeSpotifyTrack(await res.json());
}

export function corsHeaders(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}
