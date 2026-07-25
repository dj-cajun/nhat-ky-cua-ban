-- =============================================================================
-- 020 — Phase B.1 school boundary hardening (launch blockers)
-- Forward-only. Does NOT edit 007–019.
--
-- 1) School ops RPCs use app_moderators via is_app_moderator() (no JWT claim)
-- 2) Mixed-school circle detection + write freeze + ops queue
-- 3) Audit events for freeze / resolve
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Mixed-school integrity incidents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.circle_school_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  canonical_school_id UUID NOT NULL REFERENCES public.schools_v2(id),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'cancelled')),
  auto_write_blocked BOOLEAN NOT NULL DEFAULT true,
  member_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolver_id UUID REFERENCES public.app_profiles(id),
  resolve_note TEXT
);

-- Allow multiple resolved rows; only one open
DROP INDEX IF EXISTS circle_school_incidents_one_open_idx;
CREATE UNIQUE INDEX circle_school_incidents_one_open_idx
  ON public.circle_school_incidents (circle_id)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS circle_school_incidents_status_idx
  ON public.circle_school_incidents (status, detected_at DESC);

ALTER TABLE public.circle_school_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS circle_school_incidents_deny ON public.circle_school_incidents;
CREATE POLICY circle_school_incidents_deny ON public.circle_school_incidents
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.circle_school_incidents FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Write gate: freeze when open mixed-school incident
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.circle_writes_frozen(p_circle_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.circle_school_incidents i
    WHERE i.circle_id = p_circle_id
      AND i.status = 'open'
      AND i.auto_write_blocked IS TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.circle_writes_frozen(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.circle_writes_frozen(UUID) TO authenticated;

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
      AND NOT public.circle_writes_frozen(p_circle_id)
  );
$$;

-- ---------------------------------------------------------------------------
-- 3) Scan + open incidents (ops only). Never auto-rewrites memberships.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ops_scan_mixed_school_circles()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_opened INT := 0;
  v_updated INT := 0;
  v_circle RECORD;
  v_snapshot JSONB;
  v_foreign INT;
  v_existing UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_app_moderator() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  FOR v_circle IN
    SELECT c.id AS circle_id, c.school_id, c.name
    FROM public.circles c
    WHERE c.status = 'open'
  LOOP
    SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb), COUNT(*)
    INTO v_snapshot, v_foreign
    FROM (
      SELECT
        cm.user_id AS "userId",
        cm.role,
        cm.status AS "memberStatus",
        m.school_id AS "memberSchoolId",
        m.status AS "membershipStatus",
        s.display_name AS "memberSchoolName",
        cm.joined_at AS "joinedAt"
      FROM public.circle_members cm
      LEFT JOIN LATERAL (
        SELECT sm.school_id, sm.status
        FROM public.school_memberships sm
        WHERE sm.user_id = cm.user_id
          AND sm.status IN ('verified', 'pending_change', 'pending', 'suspended')
        ORDER BY
          CASE sm.status
            WHEN 'verified' THEN 0
            WHEN 'pending_change' THEN 1
            WHEN 'pending' THEN 2
            ELSE 3
          END
        LIMIT 1
      ) m ON TRUE
      LEFT JOIN public.schools_v2 s ON s.id = m.school_id
      WHERE cm.circle_id = v_circle.circle_id
        AND cm.status = 'active'
        -- Mixed = active member bound to a *different* school (not merely unverified)
        AND m.school_id IS NOT NULL
        AND m.school_id IS DISTINCT FROM v_circle.school_id
    ) x;

    IF v_foreign <= 0 THEN
      CONTINUE;
    END IF;

    SELECT i.id INTO v_existing
    FROM public.circle_school_incidents i
    WHERE i.circle_id = v_circle.circle_id AND i.status = 'open'
    LIMIT 1;

    IF v_existing IS NULL THEN
      INSERT INTO public.circle_school_incidents (
        circle_id, canonical_school_id, status, auto_write_blocked, member_snapshot
      ) VALUES (
        v_circle.circle_id, v_circle.school_id, 'open', true, v_snapshot
      );
      v_opened := v_opened + 1;
      INSERT INTO public.school_audit_events (school_id, actor_id, event_type, payload)
      VALUES (
        v_circle.school_id,
        v_uid,
        'mixed_school_circle_detected',
        jsonb_build_object(
          'circleId', v_circle.circle_id,
          'foreignMemberCount', v_foreign,
          'autoWriteBlocked', true
        )
      );
    ELSE
      UPDATE public.circle_school_incidents
      SET member_snapshot = v_snapshot,
          auto_write_blocked = true
      WHERE id = v_existing;
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'opened', v_opened,
    'updated', v_updated,
    'scannedAt', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ops_scan_mixed_school_circles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_scan_mixed_school_circles() TO authenticated;

CREATE OR REPLACE FUNCTION public.ops_list_mixed_school_circles(
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
  IF NOT public.is_app_moderator() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.detected_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      i.id,
      i.circle_id AS "circleId",
      c.name AS "circleName",
      i.canonical_school_id AS "canonicalSchoolId",
      s.display_name AS "canonicalSchoolName",
      i.status,
      i.auto_write_blocked AS "autoWriteBlocked",
      i.member_snapshot AS "memberSnapshot",
      i.detected_at AS "detectedAt",
      (
        SELECT MAX(cm.joined_at)
        FROM public.circle_members cm
        WHERE cm.circle_id = i.circle_id AND cm.status = 'active'
      ) AS "lastMemberJoinedAt"
    FROM public.circle_school_incidents i
    JOIN public.circles c ON c.id = i.circle_id
    JOIN public.schools_v2 s ON s.id = i.canonical_school_id
    WHERE i.status = 'open'
    ORDER BY i.detected_at DESC
    LIMIT v_lim
  ) t;

  RETURN jsonb_build_object('items', v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.ops_list_mixed_school_circles(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_list_mixed_school_circles(INT) TO authenticated;

-- Manual resolve only — does NOT auto-move or rewrite memberships
CREATE OR REPLACE FUNCTION public.ops_resolve_mixed_school_circle(
  p_incident_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_inc public.circle_school_incidents%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_app_moderator() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT * INTO v_inc
  FROM public.circle_school_incidents
  WHERE id = p_incident_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_inc.status <> 'open' THEN RAISE EXCEPTION 'CONFLICT'; END IF;

  UPDATE public.circle_school_incidents
  SET status = 'resolved',
      resolved_at = now(),
      resolver_id = v_uid,
      resolve_note = p_note,
      auto_write_blocked = false
  WHERE id = p_incident_id;

  INSERT INTO public.school_audit_events (school_id, actor_id, event_type, payload)
  VALUES (
    v_inc.canonical_school_id,
    v_uid,
    'mixed_school_circle_resolved',
    jsonb_build_object(
      'incidentId', p_incident_id,
      'circleId', v_inc.circle_id,
      'note', p_note
    )
  );

  RETURN jsonb_build_object('incidentId', p_incident_id, 'status', 'resolved');
END;
$$;

REVOKE ALL ON FUNCTION public.ops_resolve_mixed_school_circle(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_resolve_mixed_school_circle(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) School ops — drop JWT claim hard-gate; use app_moderators table
-- ---------------------------------------------------------------------------
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
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_app_moderator() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  SELECT * INTO v_req
  FROM public.school_verification_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'CONFLICT'; END IF;

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
  IF NOT public.is_app_moderator() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

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
  IF NOT public.is_app_moderator() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
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

-- Who am I as operator? (client must not invent role)
CREATE OR REPLACE FUNCTION public.get_my_operator_capabilities()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT m.role INTO v_role
  FROM public.app_moderators m
  WHERE m.user_id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('isModerator', false, 'role', NULL);
  END IF;

  RETURN jsonb_build_object('isModerator', true, 'role', v_role);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_operator_capabilities() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_operator_capabilities() TO authenticated;
