import { describe, expect, it } from 'vitest';
import {
  isAllowedSpotifyArtworkUrl,
  parseSpotifyTrackId,
} from '../spotify-url-parser';

describe('parseSpotifyTrackId', () => {
  it('parses open.spotify.com track URLs with query strings', () => {
    expect(
      parseSpotifyTrackId(
        'https://open.spotify.com/track/abc123XYZ?si=hello',
      ),
    ).toBe('abc123XYZ');
  });

  it('parses spotify:track URIs and bare ids', () => {
    expect(parseSpotifyTrackId('spotify:track:abc123XYZ99')).toBe('abc123XYZ99');
    expect(parseSpotifyTrackId('abc123XYZ99')).toBe('abc123XYZ99');
  });

  it('rejects album/playlist/artist links', () => {
    expect(parseSpotifyTrackId('https://open.spotify.com/album/abc')).toBeNull();
    expect(parseSpotifyTrackId('https://open.spotify.com/playlist/abc')).toBeNull();
    expect(parseSpotifyTrackId('https://open.spotify.com/artist/abc')).toBeNull();
  });
});

describe('isAllowedSpotifyArtworkUrl', () => {
  it('allows Spotify CDN hosts only', () => {
    expect(isAllowedSpotifyArtworkUrl('https://i.scdn.co/image/x')).toBe(true);
    expect(isAllowedSpotifyArtworkUrl('https://evil.example/x.png')).toBe(false);
    expect(isAllowedSpotifyArtworkUrl(null)).toBe(true);
  });
});
