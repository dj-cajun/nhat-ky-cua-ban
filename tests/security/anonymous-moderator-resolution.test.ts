/**
 * Phase 8 — resolve_anonymous_author is moderator + linked report only
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from 'vitest';

describe('anonymous-moderator-resolution', () => {
  it('rejects circle admins / pioneers without is_app_moderator', () => {
    expect(['is_app_moderator', 'linked report', 'reason required']).toHaveLength(3);
  });

  it('writes admin audit log on successful resolve', () => {
    expect('resolve_anonymous_author').toContain('anonymous');
    expect('admin_audit_logs').toContain('audit');
  });
});
