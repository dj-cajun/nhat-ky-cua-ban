-- =============================================================================
-- 019 — School trust boundary (Phase B)
-- Forward-only. Does NOT edit 007–018. Does NOT reuse 001 schools/classes.
--
-- Hierarchy: school = outer access boundary; circle = relationship unit;
--            diary = product core.
--
-- Invariants:
--   school verified ≠ circle membership
--   client school_id is never trusted
--   school change never auto-moves circle memberships
--   invite code alone never grants verified
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Schema (schools_v2 — isolated from legacy public.schools)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schools_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools_v2(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  label TEXT,
  max_redemptions INT,
  redemption_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools_v2(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'verified', 'rejected', 'suspended', 'expired', 'pending_change'
    )),
  grade TEXT,
  class_label TEXT,
  verification_method TEXT,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, user_id)
);

CREATE INDEX IF NOT EXISTS school_memberships_user_status_idx
  ON public.school_memberships (user_id, status);

CREATE TABLE IF NOT EXISTS public.school_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools_v2(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  invite_code_id UUID REFERENCES public.school_invite_codes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  method TEXT NOT NULL DEFAULT 'beta_code'
    CHECK (method IN ('beta_code', 'member_vouch', 'manual_review', 'email_domain')),
  reviewer_id UUID REFERENCES public.app_profiles(id),
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.school_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  from_school_id UUID REFERENCES public.schools_v2(id),
  to_school_id UUID NOT NULL REFERENCES public.schools_v2(id),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewer_id UUID REFERENCES public.app_profiles(id),
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.school_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools_v2(id),
  actor_id UUID,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: clients never see invite hashes / audit / raw verification evidence
ALTER TABLE public.schools_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS schools_v2_select_authenticated ON public.schools_v2;
CREATE POLICY schools_v2_select_authenticated ON public.schools_v2
  FOR SELECT TO authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS school_memberships_select_self ON public.school_memberships;
CREATE POLICY school_memberships_select_self ON public.school_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS school_verification_requests_select_self ON public.school_verification_requests;
CREATE POLICY school_verification_requests_select_self ON public.school_verification_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS school_change_requests_select_self ON public.school_change_requests;
CREATE POLICY school_change_requests_select_self ON public.school_change_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Deny-all for invite codes + audit (RPC only)
DROP POLICY IF EXISTS school_invite_codes_deny ON public.school_invite_codes;
CREATE POLICY school_invite_codes_deny ON public.school_invite_codes
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS school_audit_events_deny ON public.school_audit_events;
CREATE POLICY school_audit_events_deny ON public.school_audit_events
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

REVOKE ALL ON public.school_invite_codes FROM anon, authenticated;
REVOKE ALL ON public.school_audit_events FROM anon, authenticated;
GRANT SELECT ON public.schools_v2 TO authenticated;
GRANT SELECT ON public.school_memberships TO authenticated;
GRANT SELECT ON public.school_verification_requests TO authenticated;
GRANT SELECT ON public.school_change_requests TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) circles.school_id — nullable → backfill → NOT NULL
-- ---------------------------------------------------------------------------
ALTER TABLE public.circles
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools_v2(id);

-- Seed beta school + invite code (hash of 'BETA-SCHOOL-2026' via sha256 hex)
INSERT INTO public.schools_v2 (id, display_name, slug, status)
VALUES (
  'a0000000-0000-4000-8000-0000000000b1',
  'Your Diary Beta School',
  'yd-beta-school',
  'active'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.school_invite_codes (school_id, code_hash, label, max_redemptions)
SELECT
  s.id,
  encode(digest('BETA-SCHOOL-2026', 'sha256'), 'hex'),
  'beta-default',
  NULL
FROM public.schools_v2 s
WHERE s.slug = 'yd-beta-school'
  AND NOT EXISTS (
    SELECT 1 FROM public.school_invite_codes c
    WHERE c.code_hash = encode(digest('BETA-SCHOOL-2026', 'sha256'), 'hex')
  );

-- Backfill: assign all existing circles to beta school when unset
UPDATE public.circles c
SET school_id = s.id
FROM public.schools_v2 s
WHERE s.slug = 'yd-beta-school'
  AND c.school_id IS NULL;

-- Integrity: no open circle without school
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.circles WHERE school_id IS NULL) THEN
    RAISE EXCEPTION 'SCHOOL_BACKFILL_INCOMPLETE';
  END IF;
END $$;

ALTER TABLE public.circles
  ALTER COLUMN school_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS circles_school_id_idx ON public.circles (school_id);

-- ---------------------------------------------------------------------------
-- 3) Common authorization helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_verified_school_member(
  p_user_id UUID,
  p_school_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.school_memberships m
    JOIN public.schools_v2 s ON s.id = m.school_id
    WHERE m.user_id = p_user_id
      AND m.school_id = p_school_id
      AND m.status = 'verified'
      AND s.status = 'active'
      AND (m.expires_at IS NULL OR m.expires_at > now())
  );
$$;

-- Read path: verified OR pending_change (beta: keep reading during transfer review)
CREATE OR REPLACE FUNCTION public.is_school_member_for_access(
  p_user_id UUID,
  p_school_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.school_memberships m
    JOIN public.schools_v2 s ON s.id = m.school_id
    WHERE m.user_id = p_user_id
      AND m.school_id = p_school_id
      AND m.status IN ('verified', 'pending_change')
      AND s.status = 'active'
      AND (m.expires_at IS NULL OR m.expires_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.resolve_my_verified_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT m.school_id
  FROM public.school_memberships m
  JOIN public.schools_v2 s ON s.id = m.school_id
  WHERE m.user_id = auth.uid()
    AND m.status = 'verified'
    AND s.status = 'active'
    AND (m.expires_at IS NULL OR m.expires_at > now())
  ORDER BY m.verified_at DESC NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_access_circle(
  p_user_id UUID,
  p_circle_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.circles c
    JOIN public.circle_members cm
      ON cm.circle_id = c.id
     AND cm.user_id = p_user_id
     AND cm.status = 'active'
    WHERE c.id = p_circle_id
      AND public.is_school_member_for_access(p_user_id, c.school_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_circle(
  p_user_id UUID,
  p_circle_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.circles c
    JOIN public.circle_members cm
      ON cm.circle_id = c.id
     AND cm.user_id = p_user_id
     AND cm.status = 'active'
    WHERE c.id = p_circle_id
      AND public.is_verified_school_member(p_user_id, c.school_id)
  );
$$;

REVOKE ALL ON FUNCTION public.is_verified_school_member(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_school_member_for_access(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_my_verified_school_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_circle(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_write_circle(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_verified_school_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_school_member_for_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_my_verified_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_circle(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_circle(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Replace membership gates used by RLS + RPCs
-- ---------------------------------------------------------------------------

-- Read/select path (RLS): school access + active circle membership
CREATE OR REPLACE FUNCTION public.is_circle_member(target_circle_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.can_access_circle(auth.uid(), target_circle_id);
$$;

CREATE OR REPLACE FUNCTION public.is_active_circle_member(
  p_circle_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.can_access_circle(p_user_id, p_circle_id);
$$;

CREATE OR REPLACE FUNCTION public.shares_open_circle(p_other UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.circle_members a
    JOIN public.circle_members b ON a.circle_id = b.circle_id
    JOIN public.circles c ON c.id = a.circle_id AND c.status = 'open'
    WHERE a.user_id = auth.uid()
      AND b.user_id = p_other
      AND a.status = 'active'
      AND b.status = 'active'
      AND public.is_school_member_for_access(auth.uid(), c.school_id)
      AND public.is_school_member_for_access(p_other, c.school_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_circle_member_from_topic(
  target_topic TEXT,
  target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_circle UUID;
BEGIN
  IF target_topic IS NULL OR target_topic !~ '^circle:[0-9a-f-]{36}$' THEN
    RETURN false;
  END IF;
  v_circle := substring(target_topic from 8)::uuid;
  RETURN public.can_access_circle(target_user_id, v_circle);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) open_circle_from_draft — server assigns school_id; all founders same school
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.open_circle_from_draft(p_draft_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_draft public.circle_drafts%ROWTYPE;
  v_count INT;
  v_accepted INT;
  v_circle_id UUID;
  v_row RECORD;
  v_school_id UUID;
  v_proposer UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT * INTO v_draft
  FROM public.circle_drafts
  WHERE id = p_draft_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_draft.status IS DISTINCT FROM 'pending' AND v_draft.status IS DISTINCT FROM NULL THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.circle_draft_members
    WHERE draft_id = p_draft_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT COUNT(DISTINCT user_id), COUNT(*) FILTER (WHERE response_status = 'accepted')
    INTO v_count, v_accepted
  FROM public.circle_draft_members
  WHERE draft_id = p_draft_id;

  IF v_count <> 3 OR v_accepted <> 3 THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  v_proposer := COALESCE(v_draft.proposer_id, v_draft.inviter_id);
  -- Server resolves school from proposer's verified membership (ignore any client field)
  SELECT m.school_id INTO v_school_id
  FROM public.school_memberships m
  JOIN public.schools_v2 s ON s.id = m.school_id
  WHERE m.user_id = v_proposer
    AND m.status = 'verified'
    AND s.status = 'active'
    AND (m.expires_at IS NULL OR m.expires_at > now())
  ORDER BY m.verified_at DESC NULLS LAST
  LIMIT 1;

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Every founding member must be verified at the same school
  FOR v_row IN
    SELECT user_id FROM public.circle_draft_members WHERE draft_id = p_draft_id
  LOOP
    IF NOT public.is_verified_school_member(v_row.user_id, v_school_id) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  END LOOP;

  INSERT INTO public.circles (
    name, description, color, symbol, created_by, status, opened_at, school_id
  )
  VALUES (
    COALESCE(v_draft.proposed_name, v_draft.name),
    '',
    '#7C9A8E',
    '○',
    v_proposer,
    'open',
    now(),
    v_school_id
  )
  RETURNING id INTO v_circle_id;

  FOR v_row IN
    SELECT user_id, member_type
    FROM public.circle_draft_members
    WHERE draft_id = p_draft_id
  LOOP
    INSERT INTO public.circle_members (circle_id, user_id, role, is_pioneer, status)
    VALUES (
      v_circle_id,
      v_row.user_id,
      CASE WHEN v_row.member_type = 'proposer' THEN 'admin' ELSE 'pioneer' END,
      true,
      'active'
    );
  END LOOP;

  UPDATE public.circle_drafts
  SET status = 'opened'
  WHERE id = p_draft_id;

  INSERT INTO public.school_audit_events (school_id, actor_id, event_type, payload)
  VALUES (
    v_school_id,
    auth.uid(),
    'circle_opened',
    jsonb_build_object('circleId', v_circle_id, 'draftId', p_draft_id)
  );

  RETURN v_circle_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) create_circle_join_request — applicant + recommenders same school as circle
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_circle_join_request(
  target_circle_id UUID,
  recommender_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_circle public.circles%ROWTYPE;
  v_request_id UUID;
  v_id UUID;
  v_unique UUID[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT * INTO v_circle
  FROM public.circles
  WHERE id = target_circle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_circle.status <> 'open' THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  -- Applicant must be verified at the circle's school (not merely any school)
  IF NOT public.is_verified_school_member(v_uid, v_circle.school_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF public.can_access_circle(v_uid, target_circle_id) THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  IF recommender_ids IS NULL OR cardinality(recommender_ids) <> 3 THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  SELECT ARRAY(SELECT DISTINCT unnest(recommender_ids)) INTO v_unique;
  IF cardinality(v_unique) <> 3 THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  IF v_uid = ANY (recommender_ids) THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.circle_join_requests
    WHERE circle_id = target_circle_id
      AND applicant_id = v_uid
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  FOREACH v_id IN ARRAY recommender_ids
  LOOP
    IF NOT public.can_write_circle(v_id, target_circle_id) THEN
      RAISE EXCEPTION 'VALIDATION';
    END IF;
    IF NOT public.is_verified_school_member(v_id, v_circle.school_id) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    IF public.is_blocked_between(v_uid, v_id) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  END LOOP;

  INSERT INTO public.circle_join_requests (
    circle_id, applicant_id, status, expires_at, updated_at
  )
  VALUES (
    target_circle_id, v_uid, 'pending', now() + INTERVAL '7 days', now()
  )
  RETURNING id INTO v_request_id;

  FOREACH v_id IN ARRAY recommender_ids
  LOOP
    INSERT INTO public.circle_recommendations (
      join_request_id, recommender_id, decision, status
    )
    VALUES (v_request_id, v_id, 'pending', 'pending');

    INSERT INTO public.notification_events (user_id, event_type, payload)
    VALUES (
      v_id,
      'join_recommendation_requested',
      jsonb_build_object('requestId', v_request_id, 'circleId', target_circle_id)
    );
  END LOOP;

  RETURN v_request_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7) respond_circle_recommendation — 011 logic + school write/applicant checks
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_circle_recommendation(
  recommendation_id UUID,
  decision TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_rec public.circle_recommendations%ROWTYPE;
  v_req public.circle_join_requests%ROWTYPE;
  v_circle public.circles%ROWTYPE;
  v_count INT;
  v_approved BOOLEAN := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF decision NOT IN ('recommended', 'unknown') THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  SELECT * INTO v_rec
  FROM public.circle_recommendations
  WHERE id = recommendation_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_rec.recommender_id <> v_uid THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_rec.decision <> 'pending' THEN RAISE EXCEPTION 'CONFLICT'; END IF;

  SELECT * INTO v_req
  FROM public.circle_join_requests
  WHERE id = v_rec.join_request_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  PERFORM public.expire_stale_join_request(v_req.id);
  SELECT * INTO v_req FROM public.circle_join_requests WHERE id = v_rec.join_request_id;

  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'CONFLICT'; END IF;

  IF v_req.expires_at <= now() THEN
    UPDATE public.circle_join_requests
    SET status = 'expired', updated_at = now()
    WHERE id = v_req.id;
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  SELECT * INTO v_circle FROM public.circles WHERE id = v_req.circle_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF NOT public.can_write_circle(v_uid, v_req.circle_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF NOT public.is_verified_school_member(v_req.applicant_id, v_circle.school_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF public.is_blocked_between(v_uid, v_req.applicant_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.circle_recommendations
  SET decision = decision,
      responded_at = now(),
      status = decision
  WHERE id = recommendation_id;

  IF decision <> 'recommended' THEN
    RETURN 'pending';
  END IF;

  SELECT COUNT(DISTINCT recommender_id) INTO v_count
  FROM public.circle_recommendations
  WHERE join_request_id = v_req.id
    AND decision = 'recommended';

  IF v_count >= 3 THEN
    IF EXISTS (
      SELECT 1
      FROM public.circle_recommendations r
      WHERE r.join_request_id = v_req.id
        AND r.decision = 'recommended'
        AND public.is_blocked_between(v_req.applicant_id, r.recommender_id)
    ) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    INSERT INTO public.circle_members (circle_id, user_id, role, is_pioneer, status)
    VALUES (v_req.circle_id, v_req.applicant_id, 'member', false, 'active')
    ON CONFLICT (circle_id, user_id) DO NOTHING;

    UPDATE public.circle_join_requests
    SET status = 'approved',
        approved_at = now(),
        updated_at = now()
    WHERE id = v_req.id
      AND status = 'pending';

    IF FOUND THEN
      v_approved := true;

      UPDATE public.circle_recommendations
      SET decision = 'unknown',
          responded_at = COALESCE(responded_at, now()),
          status = 'unknown'
      WHERE join_request_id = v_req.id
        AND decision = 'pending';

      IF NOT EXISTS (
        SELECT 1 FROM public.notification_events
        WHERE user_id = v_req.applicant_id
          AND event_type = 'join_request_approved'
          AND payload->>'requestId' = v_req.id::text
      ) THEN
        INSERT INTO public.notification_events (user_id, event_type, payload)
        VALUES (
          v_req.applicant_id,
          'join_request_approved',
          jsonb_build_object('requestId', v_req.id, 'circleId', v_req.circle_id)
        );
      END IF;
    END IF;

    RETURN 'approved';
  END IF;

  RETURN 'pending';
END;
$$;

-- ---------------------------------------------------------------------------
-- 8) can_view_diary_entry — selected_circles also requires school access
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_diary_entry(p_entry_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_entry public.diary_entries%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  SELECT * INTO v_entry FROM public.diary_entries WHERE id = p_entry_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_entry.user_id = v_uid THEN RETURN true; END IF;
  IF public.has_block_relation(v_uid, v_entry.user_id) THEN RETURN false; END IF;
  IF v_entry.visibility_mode = 'private' THEN RETURN false; END IF;
  IF v_entry.visibility_mode = 'all_circles' THEN
    RETURN public.shares_open_circle(v_entry.user_id);
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.diary_entry_visibility v
    WHERE v.entry_id = p_entry_id
      AND public.can_access_circle(v_uid, v.circle_id)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 9) Write guards on high-traffic RPCs (create post / anonymous / messages)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_can_write_circle(p_circle_id UUID)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF NOT public.can_write_circle(auth.uid(), p_circle_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_can_write_circle(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_can_write_circle(UUID) TO authenticated;

-- Thin wrappers: existing create_circle_post etc. already call is_circle_member;
-- add write-school check via renamed internal pattern — REPLACE create_circle_post
-- by prepending assert. Full bodies are large; we use a trigger-style guard on
-- circle_posts INSERT via RPC only (client DML already denied). Patch create:

-- Note: full REPLACE of create_circle_post / create_anonymous_post / _send_private_message
-- is done by requiring can_write_circle inside is_circle_member for writers is wrong.
-- Instead: create_circle_post from 013 checks is_circle_member — we add a companion
-- policy function used at the start of REPLACE stubs below for the critical paths.

DO $patch$
BEGIN
  -- create_circle_post: wrap by replacing with school-aware version that delegates
  -- Only if function exists (it should after 013).
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'create_circle_post'
  ) THEN
    -- Force writers through can_write by temporarily aliasing check:
    -- Re-define a helper used only for write RPCs that still call is_circle_member
    -- by making is_circle_member remain can_access, and patching write RPCs that
    -- we re-declare below.
    NULL;
  END IF;
END
$patch$;

-- ---------------------------------------------------------------------------
-- 10) School onboarding RPCs (minimal UI)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_school_invite_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_hash TEXT;
  v_code public.school_invite_codes%ROWTYPE;
  v_req_id UUID;
  v_membership_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_code IS NULL OR btrim(p_code) = '' THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  v_hash := encode(digest(btrim(p_code), 'sha256'), 'hex');

  SELECT * INTO v_code
  FROM public.school_invite_codes
  WHERE code_hash = v_hash
    AND disabled_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_code.max_redemptions IS NOT NULL
     AND v_code.redemption_count >= v_code.max_redemptions THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Code alone → pending membership + verification request (NOT verified)
  INSERT INTO public.school_memberships (school_id, user_id, status, verification_method)
  VALUES (v_code.school_id, v_uid, 'pending', 'beta_code')
  ON CONFLICT (school_id, user_id) DO UPDATE
    SET updated_at = now(),
        status = CASE
          WHEN public.school_memberships.status IN ('verified', 'suspended')
            THEN public.school_memberships.status
          ELSE 'pending'
        END
  RETURNING id INTO v_membership_id;

  INSERT INTO public.school_verification_requests (
    school_id, user_id, invite_code_id, status, method
  )
  VALUES (v_code.school_id, v_uid, v_code.id, 'pending', 'beta_code')
  RETURNING id INTO v_req_id;

  UPDATE public.school_invite_codes
  SET redemption_count = redemption_count + 1
  WHERE id = v_code.id;

  INSERT INTO public.school_audit_events (school_id, actor_id, event_type, payload)
  VALUES (
    v_code.school_id,
    v_uid,
    'invite_code_submitted',
    jsonb_build_object('requestId', v_req_id, 'membershipId', v_membership_id)
  );

  RETURN jsonb_build_object(
    'schoolId', v_code.school_id,
    'membershipStatus', 'pending',
    'requestId', v_req_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_school_membership()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT m.status, m.school_id, s.display_name, m.grade, m.class_label, m.verified_at
  INTO v_row
  FROM public.school_memberships m
  JOIN public.schools_v2 s ON s.id = m.school_id
  WHERE m.user_id = v_uid
  ORDER BY
    CASE m.status
      WHEN 'verified' THEN 0
      WHEN 'pending_change' THEN 1
      WHEN 'pending' THEN 2
      ELSE 3
    END,
    m.updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'none');
  END IF;

  RETURN jsonb_build_object(
    'status', v_row.status,
    'schoolId', v_row.school_id,
    'schoolName', v_row.display_name,
    'grade', v_row.grade,
    'classLabel', v_row.class_label,
    'verifiedAt', v_row.verified_at
  );
END;
$$;

-- Ops: approve verification → verified (least privilege: app_metadata.is_moderator)
CREATE OR REPLACE FUNCTION public.ops_review_school_verification(
  p_request_id UUID,
  p_decision TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_req public.school_verification_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF coalesce(auth.jwt() -> 'app_metadata' ->> 'is_moderator', 'false') <> 'true' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  SELECT * INTO v_req
  FROM public.school_verification_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  UPDATE public.school_verification_requests
  SET status = p_decision,
      reviewer_id = v_uid,
      review_note = p_note,
      reviewed_at = now()
  WHERE id = p_request_id;

  IF p_decision = 'approved' THEN
    UPDATE public.school_memberships
    SET status = 'verified',
        verified_at = now(),
        updated_at = now(),
        verification_method = v_req.method
    WHERE school_id = v_req.school_id
      AND user_id = v_req.user_id;
  ELSE
    UPDATE public.school_memberships
    SET status = 'rejected',
        updated_at = now()
    WHERE school_id = v_req.school_id
      AND user_id = v_req.user_id
      AND status = 'pending';
  END IF;

  INSERT INTO public.school_audit_events (school_id, actor_id, event_type, payload)
  VALUES (
    v_req.school_id,
    v_uid,
    'verification_' || p_decision,
    jsonb_build_object('requestId', p_request_id, 'userId', v_req.user_id)
  );

  RETURN jsonb_build_object('requestId', p_request_id, 'decision', p_decision);
END;
$$;

CREATE OR REPLACE FUNCTION public.request_school_change(
  p_to_school_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_from UUID;
  v_req_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.schools_v2 WHERE id = p_to_school_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT school_id INTO v_from
  FROM public.school_memberships
  WHERE user_id = v_uid AND status = 'verified'
  LIMIT 1;

  -- Immediately restrict: mark pending_change (blocks writes via can_write_circle)
  IF v_from IS NOT NULL THEN
    UPDATE public.school_memberships
    SET status = 'pending_change', updated_at = now()
    WHERE user_id = v_uid AND school_id = v_from AND status = 'verified';
  END IF;

  INSERT INTO public.school_change_requests (
    user_id, from_school_id, to_school_id, reason, status
  )
  VALUES (v_uid, v_from, p_to_school_id, p_reason, 'pending')
  RETURNING id INTO v_req_id;

  INSERT INTO public.school_audit_events (school_id, actor_id, event_type, payload)
  VALUES (
    coalesce(v_from, p_to_school_id),
    v_uid,
    'school_change_requested',
    jsonb_build_object('requestId', v_req_id, 'toSchoolId', p_to_school_id)
  );

  RETURN jsonb_build_object('requestId', v_req_id, 'status', 'pending');
END;
$$;

REVOKE ALL ON FUNCTION public.submit_school_invite_code(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_school_membership() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ops_review_school_verification(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_school_change(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_school_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_school_membership() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_review_school_verification(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_school_change(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 11) Write RPCs: assert_can_write_circle (013/016 bodies + school write gate)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_circle_post(
  target_circle_id UUID,
  post_type TEXT,
  title TEXT,
  body TEXT,
  options TEXT[],
  closes_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_post_id UUID;
  v_label TEXT;
  v_i INT := 0;
  v_member public.circle_members%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  PERFORM public.assert_can_write_circle(target_circle_id);

  IF post_type NOT IN ('notice', 'poll') THEN RAISE EXCEPTION 'VALIDATION'; END IF;
  IF title IS NULL OR char_length(btrim(title)) < 1 OR char_length(title) > 80 THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  IF body IS NOT NULL AND char_length(body) > 300 THEN RAISE EXCEPTION 'VALIDATION'; END IF;
  IF closes_at <= now() THEN RAISE EXCEPTION 'VALIDATION'; END IF;
  IF closes_at > now() + INTERVAL '7 days' THEN RAISE EXCEPTION 'VALIDATION'; END IF;
  IF closes_at < now() + INTERVAL '10 minutes' THEN RAISE EXCEPTION 'VALIDATION'; END IF;

  SELECT * INTO v_member
  FROM public.circle_members
  WHERE circle_id = target_circle_id AND user_id = v_uid AND status = 'active';

  IF v_member.role NOT IN ('admin', 'pioneer') AND COALESCE(v_member.is_pioneer, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.circle_posts p
  SET
    status = 'closed',
    closed_at = COALESCE(p.closed_at, now()),
    updated_at = now()
  WHERE p.circle_id = target_circle_id
    AND p.status = 'active'
    AND p.closes_at <= now();

  IF EXISTS (
    SELECT 1 FROM public.circle_posts
    WHERE circle_id = target_circle_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  IF post_type = 'notice' THEN
    IF options IS NOT NULL AND cardinality(options) > 0 THEN
      RAISE EXCEPTION 'VALIDATION';
    END IF;
  ELSE
    IF options IS NULL OR cardinality(options) < 2 OR cardinality(options) > 4 THEN
      RAISE EXCEPTION 'VALIDATION';
    END IF;
    IF (SELECT COUNT(DISTINCT btrim(x)) FROM unnest(options) AS x WHERE btrim(x) <> '')
       <> cardinality(options) THEN
      RAISE EXCEPTION 'VALIDATION';
    END IF;
    FOREACH v_label IN ARRAY options LOOP
      IF char_length(btrim(v_label)) < 1 OR char_length(v_label) > 40 THEN
        RAISE EXCEPTION 'VALIDATION';
      END IF;
    END LOOP;
  END IF;

  BEGIN
    INSERT INTO public.circle_posts (
      circle_id, created_by, type, title, body, status, closes_at, updated_at
    )
    VALUES (
      target_circle_id, v_uid, post_type, btrim(title), COALESCE(body, ''),
      'active', closes_at, now()
    )
    RETURNING id INTO v_post_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'CONFLICT';
  END;

  IF post_type = 'poll' THEN
    FOREACH v_label IN ARRAY options LOOP
      v_i := v_i + 1;
      INSERT INTO public.circle_poll_options (post_id, label, sort_order)
      VALUES (v_post_id, btrim(v_label), v_i);
    END LOOP;
  END IF;

  INSERT INTO public.notification_events (user_id, event_type, payload)
  SELECT cm.user_id, 'circle_post_created',
    jsonb_build_object('postId', v_post_id, 'circleId', target_circle_id, 'postType', post_type)
  FROM public.circle_members cm
  WHERE cm.circle_id = target_circle_id
    AND cm.status = 'active'
    AND cm.user_id <> v_uid;

  RETURN v_post_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_anonymous_post(
  target_circle_id UUID,
  p_body TEXT,
  p_client_request_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_alias JSONB;
  v_alias_id UUID;
  v_alias_name TEXT;
  v_post public.anonymous_posts%ROWTYPE;
  v_mod public.user_moderation_status%ROWTYPE;
  v_recent INT;
  v_day INT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  PERFORM public.assert_not_suspended();
  PERFORM public.assert_can_write_circle(target_circle_id);

  SELECT * INTO v_mod FROM public.user_moderation_status WHERE user_id = v_uid;
  IF FOUND THEN
    IF v_mod.account_status = 'restricted'
       AND v_mod.content_creation_disabled_until IS NOT NULL
       AND v_mod.content_creation_disabled_until > now() THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    IF v_mod.anonymous_posting_disabled_until IS NOT NULL
       AND v_mod.anonymous_posting_disabled_until > now() THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  END IF;

  PERFORM public.validate_anonymous_post_body(p_body);

  IF p_client_request_id IS NOT NULL THEN
    SELECT * INTO v_post
    FROM public.anonymous_posts
    WHERE author_user_id = v_uid AND client_request_id = p_client_request_id;
    IF FOUND THEN
      SELECT alias_name INTO v_alias_name FROM public.circle_aliases WHERE id = v_post.alias_id;
      RETURN jsonb_build_object(
        'id', v_post.id,
        'aliasName', v_alias_name,
        'body', v_post.body,
        'createdAt', v_post.created_at,
        'isMine', true
      );
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_recent
  FROM public.anonymous_posts
  WHERE author_user_id = v_uid
    AND circle_id = target_circle_id
    AND created_at > now() - INTERVAL '10 minutes';
  IF v_recent >= 2 THEN RAISE EXCEPTION 'RATE_LIMITED'; END IF;

  SELECT COUNT(*) INTO v_day
  FROM public.anonymous_posts
  WHERE author_user_id = v_uid
    AND circle_id = target_circle_id
    AND created_at > now() - INTERVAL '1 day';
  IF v_day >= 10 THEN RAISE EXCEPTION 'RATE_LIMITED'; END IF;

  v_alias := public.get_or_create_circle_alias(target_circle_id);
  v_alias_id := (v_alias->>'aliasId')::uuid;
  v_alias_name := v_alias->>'aliasName';

  INSERT INTO public.anonymous_posts (
    circle_id, author_user_id, alias_profile_id, alias_id, body, status,
    client_request_id, updated_at
  )
  VALUES (
    target_circle_id, v_uid, v_alias_id, v_alias_id, btrim(p_body), 'active',
    p_client_request_id, now()
  )
  RETURNING * INTO v_post;

  RETURN jsonb_build_object(
    'id', v_post.id,
    'aliasName', v_alias_name,
    'body', v_post.body,
    'createdAt', v_post.created_at,
    'isMine', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_circle_alias(target_circle_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.circle_aliases%ROWTYPE;
  v_name TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  PERFORM public.assert_not_suspended();
  PERFORM public.assert_can_write_circle(target_circle_id);

  SELECT * INTO v_row
  FROM public.circle_aliases
  WHERE circle_id = target_circle_id AND user_id = v_uid;

  IF FOUND THEN
    RETURN jsonb_build_object('aliasName', v_row.alias_name, 'aliasId', v_row.id);
  END IF;

  v_name := public.generate_circle_alias_name(target_circle_id);

  INSERT INTO public.circle_aliases (circle_id, user_id, alias_name)
  VALUES (target_circle_id, v_uid, v_name)
  ON CONFLICT (circle_id, user_id) DO UPDATE
    SET alias_name = public.circle_aliases.alias_name
  RETURNING * INTO v_row;

  INSERT INTO public.alias_profiles (id, circle_id, user_id, alias_name, assigned_at, expires_at)
  VALUES (v_row.id, target_circle_id, v_uid, v_row.alias_name, now(), now() + INTERVAL '10 years')
  ON CONFLICT (id) DO NOTHING;

  RETURN jsonb_build_object('aliasName', v_row.alias_name, 'aliasId', v_row.id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 12) Private notes send — write gate (017 wrappers)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_named_message(
  target_circle_id UUID,
  recipient_id UUID,
  body TEXT,
  reply_to_message_id UUID DEFAULT NULL,
  client_request_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_can_write_circle(target_circle_id);
  RETURN public._send_private_message(
    target_circle_id, recipient_id, body, 'named',
    reply_to_message_id, client_request_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.send_alias_message(
  target_circle_id UUID,
  recipient_id UUID,
  body TEXT,
  reply_to_message_id UUID DEFAULT NULL,
  client_request_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.assert_can_write_circle(target_circle_id);
  RETURN public._send_private_message(
    target_circle_id, recipient_id, body, 'alias',
    reply_to_message_id, client_request_id
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 13) Remaining write paths — access/write split (pending_change)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.acknowledge_circle_notice(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_post public.circle_posts%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT * INTO v_post FROM public.circle_posts WHERE id = p_post_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_post.type <> 'notice' THEN RAISE EXCEPTION 'VALIDATION'; END IF;
  IF v_post.status <> 'active' OR v_post.closes_at <= now() THEN RAISE EXCEPTION 'CONFLICT'; END IF;
  PERFORM public.assert_can_write_circle(v_post.circle_id);

  INSERT INTO public.circle_responses (post_id, user_id, response_type, option_id, created_at, updated_at)
  VALUES (p_post_id, v_uid, 'acknowledged', NULL, now(), now())
  ON CONFLICT (post_id, user_id) DO UPDATE
    SET updated_at = now(),
        response_type = 'acknowledged',
        option_id = NULL;

  IF NOT public.can_write_circle(v_uid, v_post.circle_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_post.status <> 'active' OR v_post.closes_at <= now() THEN RAISE EXCEPTION 'CONFLICT'; END IF;

  PERFORM public.enqueue_circle_response_verified(v_post.circle_id, p_post_id, v_uid);

  RETURN jsonb_build_object('responded', true, 'postId', p_post_id);
END;
$$;

REVOKE ALL ON FUNCTION public.acknowledge_circle_notice(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_circle_notice(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_circle_poll(
  p_post_id UUID,
  p_option_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_post public.circle_posts%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT * INTO v_post FROM public.circle_posts WHERE id = p_post_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_post.type <> 'poll' THEN RAISE EXCEPTION 'VALIDATION'; END IF;
  IF v_post.status <> 'active' OR v_post.closes_at <= now() THEN RAISE EXCEPTION 'CONFLICT'; END IF;
  PERFORM public.assert_can_write_circle(v_post.circle_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.circle_poll_options
    WHERE id = p_option_id AND post_id = p_post_id
  ) THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  INSERT INTO public.circle_responses (post_id, user_id, response_type, option_id, created_at, updated_at)
  VALUES (p_post_id, v_uid, 'poll_option', p_option_id, now(), now())
  ON CONFLICT (post_id, user_id) DO UPDATE
    SET option_id = EXCLUDED.option_id,
        response_type = 'poll_option',
        updated_at = now();

  IF NOT public.can_write_circle(v_uid, v_post.circle_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_post.status <> 'active' OR v_post.closes_at <= now() THEN RAISE EXCEPTION 'CONFLICT'; END IF;

  PERFORM public.enqueue_circle_response_verified(v_post.circle_id, p_post_id, v_uid);

  RETURN jsonb_build_object(
    'responded', true,
    'postId', p_post_id,
    'optionId', p_option_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.respond_circle_poll(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_circle_poll(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.close_circle_post(p_post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_post public.circle_posts%ROWTYPE;
  v_member public.circle_members%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO v_post FROM public.circle_posts WHERE id = p_post_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  PERFORM public.assert_can_write_circle(v_post.circle_id);

  SELECT * INTO v_member
  FROM public.circle_members
  WHERE circle_id = v_post.circle_id AND user_id = v_uid AND status = 'active';

  IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_post.created_by <> v_uid
     AND v_member.role NOT IN ('admin', 'pioneer')
     AND COALESCE(v_member.is_pioneer, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.circle_posts
  SET status = 'closed', closed_at = now(), updated_at = now()
  WHERE id = p_post_id AND status = 'active';

  IF FOUND THEN
    PERFORM public.enqueue_circle_post_closed(v_post.circle_id, p_post_id);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.close_circle_post(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_circle_post(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_anonymous_post(p_post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_post public.anonymous_posts%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO v_post FROM public.anonymous_posts WHERE id = p_post_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_post.author_user_id <> v_uid THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM public.assert_can_write_circle(v_post.circle_id);
  IF v_post.status <> 'active' THEN RETURN; END IF;

  UPDATE public.anonymous_posts
  SET status = 'deleted', deleted_at = now(), updated_at = now(), hidden = true
  WHERE id = p_post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_anonymous_post(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_anonymous_post(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.reply_to_private_message(
  source_message_id UUID,
  sender_mode TEXT,
  body TEXT,
  client_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_src public.private_messages%ROWTYPE;
  v_recipient UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO v_src FROM public.private_messages WHERE id = source_message_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_uid <> v_src.sender_id AND v_uid <> v_src.recipient_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  PERFORM public.assert_can_write_circle(v_src.circle_id);
  v_recipient := CASE WHEN v_uid = v_src.sender_id THEN v_src.recipient_id ELSE v_src.sender_id END;
  RETURN public._send_private_message(
    v_src.circle_id, v_recipient, body, sender_mode,
    source_message_id, client_request_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reply_to_private_message(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reply_to_private_message(UUID, TEXT, TEXT, UUID) TO authenticated;

-- Invite preview: same-school membership required (not just knowing circle id)
CREATE OR REPLACE FUNCTION public.get_circle_invite_preview(p_circle_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_circle public.circles%ROWTYPE;
  v_member_count INT;
  v_is_member BOOLEAN;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT * INTO v_circle
  FROM public.circles
  WHERE id = p_circle_id AND status = 'open';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  -- Cross-school / unverified: do not leak circle metadata by id
  IF NOT public.is_school_member_for_access(v_uid, v_circle.school_id) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT COUNT(*) INTO v_member_count
  FROM public.circle_members
  WHERE circle_id = p_circle_id AND status = 'active';

  v_is_member := public.is_circle_member(p_circle_id);

  RETURN jsonb_build_object(
    'id', v_circle.id,
    'name', v_circle.name,
    'description', v_circle.description,
    'color', v_circle.color,
    'symbol', v_circle.symbol,
    'memberCount', v_member_count,
    'isMember', v_is_member
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_circle_invite_preview(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_circle_invite_preview(UUID) TO authenticated;

-- Shared-circle WRITE (guestbook / diary visits that mutate)
CREATE OR REPLACE FUNCTION public.can_write_shared_with(p_other UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.circle_members a
    JOIN public.circle_members b ON a.circle_id = b.circle_id
    JOIN public.circles c ON c.id = a.circle_id AND c.status = 'open'
    WHERE a.user_id = auth.uid()
      AND b.user_id = p_other
      AND a.status = 'active'
      AND b.status = 'active'
      AND public.is_verified_school_member(auth.uid(), c.school_id)
      AND public.is_school_member_for_access(p_other, c.school_id)
  );
$$;

REVOKE ALL ON FUNCTION public.can_write_shared_with(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_shared_with(UUID) TO authenticated;

DROP POLICY IF EXISTS guestbook_insert ON public.guestbook_entries;
CREATE POLICY guestbook_insert ON public.guestbook_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = (SELECT auth.uid())
    AND NOT public.has_block_relation((SELECT auth.uid()), owner_user_id)
    AND (
      owner_user_id = (SELECT auth.uid())
      OR public.can_write_shared_with(owner_user_id)
    )
  );

-- Presence: subscribe = access; publish = write
CREATE OR REPLACE FUNCTION public.can_write_circle_from_topic(
  target_topic TEXT,
  target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_circle UUID;
BEGIN
  IF target_topic IS NULL OR target_topic !~ '^circle:[0-9a-f-]{36}$' THEN
    RETURN false;
  END IF;
  v_circle := substring(target_topic from 8)::uuid;
  RETURN public.can_write_circle(target_user_id, v_circle);
END;
$$;

REVOKE ALL ON FUNCTION public.can_write_circle_from_topic(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_write_circle_from_topic(TEXT, UUID) TO authenticated;

DROP POLICY IF EXISTS "circle members can publish presence" ON realtime.messages;
CREATE POLICY "circle members can publish presence"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.messages.extension = 'presence'
  AND public.can_write_circle_from_topic(
    (SELECT realtime.topic()),
    (SELECT auth.uid())
  )
);

-- Ops: school change review (no auto circle move)
CREATE OR REPLACE FUNCTION public.ops_review_school_change(
  p_request_id UUID,
  p_decision TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_req public.school_change_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF coalesce(auth.jwt() -> 'app_metadata' ->> 'is_moderator', 'false') <> 'true' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  SELECT * INTO v_req
  FROM public.school_change_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'CONFLICT'; END IF;

  UPDATE public.school_change_requests
  SET status = p_decision,
      reviewer_id = v_uid,
      review_note = p_note,
      reviewed_at = now()
  WHERE id = p_request_id;

  IF p_decision = 'approved' THEN
    -- End old membership (no circle auto-move). New school verified separately.
    UPDATE public.school_memberships
    SET status = 'expired',
        updated_at = now()
    WHERE user_id = v_req.user_id
      AND school_id = v_req.from_school_id
      AND status IN ('verified', 'pending_change');

    INSERT INTO public.school_memberships (
      school_id, user_id, status, verification_method, verified_at
    )
    VALUES (
      v_req.to_school_id, v_req.user_id, 'verified', 'manual_review', now()
    )
    ON CONFLICT (school_id, user_id) DO UPDATE
      SET status = 'verified',
          verified_at = now(),
          updated_at = now(),
          verification_method = 'manual_review';
  ELSE
    -- Reject change: restore verified on previous school if pending_change
    UPDATE public.school_memberships
    SET status = 'verified',
        updated_at = now()
    WHERE user_id = v_req.user_id
      AND school_id = v_req.from_school_id
      AND status = 'pending_change';
  END IF;

  INSERT INTO public.school_audit_events (school_id, actor_id, event_type, payload)
  VALUES (
    COALESCE(v_req.to_school_id, v_req.from_school_id),
    v_uid,
    'school_change_' || p_decision,
    jsonb_build_object(
      'requestId', p_request_id,
      'userId', v_req.user_id,
      'fromSchoolId', v_req.from_school_id,
      'toSchoolId', v_req.to_school_id
    )
  );

  RETURN jsonb_build_object('requestId', p_request_id, 'decision', p_decision);
END;
$$;

REVOKE ALL ON FUNCTION public.ops_review_school_change(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_review_school_change(UUID, TEXT, TEXT) TO authenticated;

-- Ops list pending verification queue (minimal console)
CREATE OR REPLACE FUNCTION public.ops_list_school_verification_requests(
  p_limit INT DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_lim INT := GREATEST(1, LEAST(COALESCE(p_limit, 50), 100));
  v_items JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF coalesce(auth.jwt() -> 'app_metadata' ->> 'is_moderator', 'false') <> 'true' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at ASC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      r.id,
      r.school_id AS "schoolId",
      s.display_name AS "schoolName",
      r.user_id AS "userId",
      r.status,
      r.method,
      r.created_at AS "createdAt"
    FROM public.school_verification_requests r
    JOIN public.schools_v2 s ON s.id = r.school_id
    WHERE r.status = 'pending'
    ORDER BY r.created_at ASC
    LIMIT v_lim
  ) t;

  RETURN jsonb_build_object('items', v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.ops_list_school_verification_requests(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_list_school_verification_requests(INT) TO authenticated;

REVOKE ALL ON FUNCTION public.submit_school_invite_code(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_school_invite_code(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_school_membership() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_school_membership() TO authenticated;
REVOKE ALL ON FUNCTION public.ops_review_school_verification(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_review_school_verification(UUID, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.request_school_change(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_school_change(UUID, TEXT) TO authenticated;
CREATE OR REPLACE FUNCTION public._send_private_message(
  p_circle_id UUID,
  p_recipient_id UUID,
  p_body TEXT,
  p_sender_mode TEXT,
  p_reply_to_message_id UUID,
  p_client_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_mod public.user_moderation_status%ROWTYPE;
  v_prefs public.message_preferences%ROWTYPE;
  v_alias public.circle_aliases%ROWTYPE;
  v_existing public.private_messages%ROWTYPE;
  v_reply public.private_messages%ROWTYPE;
  v_msg public.private_messages%ROWTYPE;
  v_count INT;
  v_display TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  PERFORM public.assert_not_suspended();

  IF p_recipient_id IS NULL OR p_recipient_id = v_uid THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  IF p_client_request_id IS NULL THEN RAISE EXCEPTION 'VALIDATION'; END IF;
  IF p_sender_mode NOT IN ('named', 'alias') THEN RAISE EXCEPTION 'VALIDATION'; END IF;

  -- Sender needs write (verified); recipient needs access (verified|pending_change)
  IF NOT public.can_write_circle(v_uid, p_circle_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF NOT public.can_access_circle(p_recipient_id, p_circle_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF public.has_block_relation(v_uid, p_recipient_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_mod FROM public.user_moderation_status WHERE user_id = v_uid;
  IF FOUND THEN
    IF v_mod.account_status IN ('restricted', 'suspended') THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    IF v_mod.messaging_disabled_until IS NOT NULL
       AND v_mod.messaging_disabled_until > now() THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  END IF;

  v_prefs := public.ensure_message_preferences(p_recipient_id);
  IF p_sender_mode = 'named' AND NOT v_prefs.named_messages_enabled THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF p_sender_mode = 'alias' AND NOT v_prefs.alias_messages_enabled THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM public.validate_private_message_body(p_body);

  -- Idempotency
  SELECT * INTO v_existing
  FROM public.private_messages
  WHERE sender_id = v_uid AND client_request_id = p_client_request_id;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', v_existing.id,
      'senderMode', v_existing.sender_mode,
      'createdAt', v_existing.created_at,
      'idempotent', true
    );
  END IF;

  IF p_reply_to_message_id IS NOT NULL THEN
    SELECT * INTO v_reply FROM public.private_messages WHERE id = p_reply_to_message_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
    IF v_reply.status = 'removed' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
    IF v_uid <> v_reply.sender_id AND v_uid <> v_reply.recipient_id THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    IF p_recipient_id <> v_reply.sender_id AND p_recipient_id <> v_reply.recipient_id THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    IF public.private_message_reply_depth(p_reply_to_message_id) >= 3 THEN
      RAISE EXCEPTION 'VALIDATION';
    END IF;
  END IF;

  -- Rate limits
  IF p_sender_mode = 'named' THEN
    SELECT count(*) INTO v_count FROM public.private_messages
    WHERE sender_id = v_uid AND recipient_id = p_recipient_id
      AND sender_mode = 'named'
      AND created_at > now() - interval '10 minutes';
    IF v_count >= 3 THEN RAISE EXCEPTION 'RATE_LIMITED'; END IF;

    SELECT count(*) INTO v_count FROM public.private_messages
    WHERE sender_id = v_uid AND recipient_id = p_recipient_id
      AND sender_mode = 'named'
      AND created_at > now() - interval '1 day';
    IF v_count >= 10 THEN RAISE EXCEPTION 'RATE_LIMITED'; END IF;
  ELSE
    SELECT count(*) INTO v_count FROM public.private_messages
    WHERE sender_id = v_uid AND recipient_id = p_recipient_id
      AND sender_mode = 'alias'
      AND created_at > now() - interval '24 hours';
    IF v_count >= 1 THEN RAISE EXCEPTION 'RATE_LIMITED'; END IF;

    SELECT count(*) INTO v_count FROM public.private_messages
    WHERE sender_id = v_uid AND recipient_id = p_recipient_id
      AND sender_mode = 'alias'
      AND created_at > now() - interval '7 days';
    IF v_count >= 2 THEN RAISE EXCEPTION 'RATE_LIMITED'; END IF;

    SELECT count(*) INTO v_count FROM public.private_messages
    WHERE sender_id = v_uid
      AND sender_mode = 'alias'
      AND created_at > now() - interval '1 day';
    IF v_count >= 5 THEN RAISE EXCEPTION 'RATE_LIMITED'; END IF;
  END IF;

  IF p_sender_mode = 'alias' THEN
    PERFORM public.get_or_create_circle_alias(p_circle_id);
    SELECT * INTO v_alias
    FROM public.circle_aliases
    WHERE circle_id = p_circle_id AND user_id = v_uid;
  END IF;

  INSERT INTO public.private_messages (
    circle_id, sender_id, recipient_id, sender_mode, alias_id, body,
    reply_to_message_id, status, client_request_id
  ) VALUES (
    p_circle_id, v_uid, p_recipient_id, p_sender_mode,
    CASE WHEN p_sender_mode = 'alias' THEN v_alias.id ELSE NULL END,
    btrim(p_body), p_reply_to_message_id, 'active', p_client_request_id
  )
  RETURNING * INTO v_msg;

  INSERT INTO public.private_message_user_states (message_id, user_id)
  VALUES (v_msg.id, p_recipient_id)
  ON CONFLICT DO NOTHING;

  IF p_sender_mode = 'named' THEN
    SELECT display_name INTO v_display FROM public.app_profiles WHERE id = v_uid;
    INSERT INTO public.notification_events (user_id, event_type, payload)
    VALUES (
      p_recipient_id,
      'private_message_received',
      jsonb_build_object(
        'messageId', v_msg.id,
        'senderMode', 'named',
        'senderDisplay', COALESCE(v_display, 'Someone'),
        'circleId', p_circle_id
      )
    );
  ELSE
    INSERT INTO public.notification_events (user_id, event_type, payload)
    VALUES (
      p_recipient_id,
      'private_message_received',
      jsonb_build_object(
        'messageId', v_msg.id,
        'senderMode', 'alias',
        'circleId', p_circle_id
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'id', v_msg.id,
    'senderMode', v_msg.sender_mode,
    'createdAt', v_msg.created_at,
    'idempotent', false
  );
END;
$$;
