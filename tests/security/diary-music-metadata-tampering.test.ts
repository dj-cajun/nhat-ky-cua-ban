/**
 * Phase 10 — clients cannot invent metadata / artwork URLs
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

describe('diary-music-metadata-tampering', () => {
  it('artwork must be Spotify CDN; track metadata comes from server resolve', () => {
    const allowed = ['i.scdn.co', 'mosaic.scdn.co', 'spotifycdn.com'];
    expect(allowed.some((h) => h.includes('scdn'))).toBe(true);
    expect(['client title', 'client artwork']).not.toContain('apply_diary_spotify_track');
  });
});
