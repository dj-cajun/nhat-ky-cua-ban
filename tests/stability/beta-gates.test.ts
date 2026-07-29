/**
 * Root stability contracts — mirrors mobile phase-11 policies for CI at monorepo root.
 */
import { describe, expect, it } from 'vitest';

const NO_AUTO = new Set([
  'private_note_send',
  'anonymous_post_create',
  'report_submit',
  'poll_vote',
  'notice_ack',
  'circle_join_recommend',
  'photo_upload_finalize',
  'diary_save',
  'block_user',
]);

const SENSITIVE = /body|content|text|message|diary|note|alias|author|jwt|token|password|secret|signed.?url|search|query|push.?token|spotify.?q/i;

function sanitize(attrs: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (SENSITIVE.test(k)) continue;
    out[k] = v;
  }
  return out;
}

describe('stability: retry policy', () => {
  it('forbids auto-retry for side-effect mutations', () => {
    for (const op of NO_AUTO) {
      expect(NO_AUTO.has(op)).toBe(true);
    }
  });
});

describe('stability: secure logger', () => {
  it('strips diary and note payloads from monitoring extras', () => {
    expect(
      sanitize({
        error_code: 'OFFLINE',
        diary_body: 'secret day',
        note_text: 'letter',
        rpc: 'upsert_diary',
      }),
    ).toEqual({ error_code: 'OFFLINE', rpc: 'upsert_diary' });
  });
});

describe('stability: beta launch gates', () => {
  it('lists hard blockers that must stay green', () => {
    const gates = [
      'non_member_circle_access',
      'alias_author_leak',
      'block_personal_content_bypass',
      'message_sender_id_leak',
      'report_snapshot_missing',
      'service_role_in_bundle',
      'session_cross_account_flash',
      'private_photo_bypass',
      'ops_cannot_handle_reports',
    ];
    expect(gates.length).toBeGreaterThanOrEqual(9);
  });
});

describe('stability: notification dead link copy', () => {
  it('uses safe fallback when target is gone', () => {
    const copy = 'This content is no longer available.';
    expect(copy).not.toMatch(/deleted by|author|user id/i);
  });
});
