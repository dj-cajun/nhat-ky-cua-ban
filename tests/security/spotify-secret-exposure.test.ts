/**
 * Phase 10 — Spotify secrets never ship in the mobile bundle
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('spotify-secret-exposure', () => {
  it('mobile env example forbids Spotify secret / service role', () => {
    const envExample = readFileSync(
      join(process.cwd(), 'mobile/.env.example'),
      'utf8',
    );
    expect(envExample).toMatch(/Never put service role \/ Spotify secret/i);
    expect(envExample).not.toMatch(/SPOTIFY_CLIENT_SECRET\s*=/);
  });
});
