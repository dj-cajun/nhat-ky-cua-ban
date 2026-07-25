/** Parse Spotify track URL / URI / bare ID. Rejects album/playlist/etc. */
export function parseSpotifyTrackId(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  if (/\/(album|artist|playlist|episode|show)\//i.test(v)) return null;
  const uri = v.match(/spotify:track:([A-Za-z0-9]+)/i);
  if (uri?.[1]) return uri[1];
  const url = v.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/i);
  if (url?.[1]) return url[1];
  if (/^[A-Za-z0-9]{10,30}$/.test(v)) return v;
  return null;
}

export function isAllowedSpotifyArtworkUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  return (
    /^https:\/\/i\.scdn\.co\//i.test(url) ||
    /^https:\/\/mosaic\.scdn\.co\//i.test(url) ||
    /^https:\/\/image-cdn-[\w.-]+\.spotifycdn\.com\//i.test(url)
  );
}
