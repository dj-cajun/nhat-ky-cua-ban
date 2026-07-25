-- Phase B.1 — staging JWT penetration checklist (launch blocker)
-- Run against staging with real Supabase Auth sessions (not local mirror).
-- Document pass/fail in the PR or ops runbook before Phase C UI expansion.

-- Personas (separate JWTs):
--   A  school-A verified + circle X member
--   B  school-A pending_change + circle X member
--   C  school-A verified + NOT in circle X
--   D  school-B verified (+ knows circle X id, diary id, note id, invite link)
--   E  school-A suspended
--   M  app_moderators row (operator)

-- ---------------------------------------------------------------------------
-- Known-ID / invite / deep-link attacks (as D)
-- ---------------------------------------------------------------------------
-- select public.get_circle_invite_preview('<circle_x>');           -- NOT_FOUND
-- select public.create_circle_join_request('<circle_x>', ...);     -- FORBIDDEN
-- select public.get_anonymous_circle_posts('<circle_x>');          -- FORBIDDEN
-- select public.can_view_diary_entry('<diary_id>');                -- false
-- select public.send_named_message('<circle_x>', ...);             -- FORBIDDEN
-- select public.create_photo_signed_url_token(...);                -- FORBIDDEN
-- Presence subscribe topic circle:<x>                             -- denied
-- App deep link /circles/<x>/join                                 -- blocked before join UI data

-- ---------------------------------------------------------------------------
-- pending_change (as B)
-- ---------------------------------------------------------------------------
-- select public.can_access_circle(auth.uid(), '<circle_x>');       -- true
-- select public.can_write_circle(auth.uid(), '<circle_x>');        -- false
-- select public.create_circle_post(...);                           -- FORBIDDEN
-- select public.create_anonymous_post(...);                        -- FORBIDDEN
-- select public.respond_circle_recommendation(...);                -- FORBIDDEN

-- ---------------------------------------------------------------------------
-- same-school non-member (as C)
-- ---------------------------------------------------------------------------
-- circle internals / diary shared / notes — FORBIDDEN / false

-- ---------------------------------------------------------------------------
-- suspended (as E)
-- ---------------------------------------------------------------------------
-- can_access_circle / can_write_circle — false

-- ---------------------------------------------------------------------------
-- Operator role (as M vs A)
-- ---------------------------------------------------------------------------
-- select public.get_my_operator_capabilities();  -- M: true / A: false
-- select public.ops_list_school_verification_requests(); -- A: FORBIDDEN
-- select public.ops_scan_mixed_school_circles();         -- A: FORBIDDEN
-- No client-bundled moderator JWT / service role

-- ---------------------------------------------------------------------------
-- Mixed-school freeze
-- ---------------------------------------------------------------------------
-- Seed one foreign-school member row on circle X
-- M: ops_scan_mixed_school_circles → open incident + auto_write_blocked
-- A: can_write_circle false; create_circle_post FORBIDDEN
-- M: ops_resolve_mixed_school_circle after manual cleanup → writes restore
-- Confirm school_audit_events rows for detect + resolve

-- ---------------------------------------------------------------------------
-- Account switch / stale cache
-- ---------------------------------------------------------------------------
-- Sign in as A, open circle X, switch to D without killing process
-- Confirm query caches cleared (universe / circle / diary / messages)
-- Confirm Presence left previous topic
-- Confirm D cannot open cached circle href / known ids

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------
-- verification approve/reject → school_audit_events
-- school change approve/reject → school_audit_events
-- mixed detect/resolve → school_audit_events
-- admin_audit_logs for report hide / account status (015)
