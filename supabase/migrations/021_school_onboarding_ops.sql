-- =============================================================================
-- 021 — Phase C school onboarding / ops surfaces (forward-only)
-- Adds needs_more_info, change-request list, invite-code ops, school audit list.
-- Does not edit 007–020.
-- =============================================================================

-- Membership + verification: needs_more_info ("추가 확인 필요")
ALTER TABLE public.school_memberships DROP CONSTRAINT IF EXISTS school_memberships_status_check;
ALTER TABLE public.school_memberships
  ADD CONSTRAINT school_memberships_status_check
  CHECK (status IN (
    'pending', 'needs_more_info', 'verified', 'rejected',
    'suspended', 'expired', 'pending_change'
  ));

ALTER TABLE public.school_verification_requests DROP CONSTRAINT IF EXISTS school_verification_requests_status_check;
ALTER TABLE public.school_verification_requests
  ADD CONSTRAINT school_verification_requests_status_check
  CHECK (status IN ('pending', 'needs_more_info', 'approved', 'rejected', 'cancelled'));

-- ---------------------------------------------------------------------------
-- get_my_school_membership — include needs_more_info + open change request
-- ---------------------------------------------------------------------------
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
  v_change JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT m.status, m.school_id, s.display_name, m.grade, m.class_label, m.verified_at,
         (
           SELECT r.status
           FROM public.school_verification_requests r
           WHERE r.user_id = v_uid AND r.school_id = m.school_id
           ORDER BY r.created_at DESC
           LIMIT 1
         ) AS request_status,
         (
           SELECT r.review_note
           FROM public.school_verification_requests r
           WHERE r.user_id = v_uid AND r.school_id = m.school_id
           ORDER BY r.created_at DESC
           LIMIT 1
         ) AS review_note
  INTO v_row
  FROM public.school_memberships m
  JOIN public.schools_v2 s ON s.id = m.school_id
  WHERE m.user_id = v_uid
  ORDER BY
    CASE m.status
      WHEN 'verified' THEN 0
      WHEN 'pending_change' THEN 1
      WHEN 'needs_more_info' THEN 2
      WHEN 'pending' THEN 3
      ELSE 4
    END,
    m.updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'none');
  END IF;

  SELECT jsonb_build_object(
    'requestId', c.id,
    'toSchoolId', c.to_school_id,
    'toSchoolName', ts.display_name,
    'status', c.status,
    'reason', c.reason
  )
  INTO v_change
  FROM public.school_change_requests c
  JOIN public.schools_v2 ts ON ts.id = c.to_school_id
  WHERE c.user_id = v_uid AND c.status = 'pending'
  ORDER BY c.created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'status', v_row.status,
    'schoolId', v_row.school_id,
    'schoolName', v_row.display_name,
    'grade', v_row.grade,
    'classLabel', v_row.class_label,
    'verifiedAt', v_row.verified_at,
    'requestStatus', v_row.request_status,
    'reviewNote', v_row.review_note,
    'pendingChange', v_change
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- ops_review_school_verification — allow needs_more_info
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
  IF p_decision NOT IN ('approved', 'rejected', 'needs_more_info') THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  IF p_decision IN ('rejected', 'needs_more_info')
     AND (p_note IS NULL OR btrim(p_note) = '') THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  SELECT * INTO v_req
  FROM public.school_verification_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_req.status NOT IN ('pending', 'needs_more_info') THEN
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
    WHERE school_id = v_req.school_id AND user_id = v_req.user_id;
  ELSIF p_decision = 'rejected' THEN
    UPDATE public.school_memberships
    SET status = 'rejected', updated_at = now()
    WHERE school_id = v_req.school_id AND user_id = v_req.user_id
      AND status IN ('pending', 'needs_more_info');
  ELSE
    UPDATE public.school_memberships
    SET status = 'needs_more_info', updated_at = now()
    WHERE school_id = v_req.school_id AND user_id = v_req.user_id
      AND status IN ('pending', 'needs_more_info');
  END IF;

  INSERT INTO public.school_audit_events (school_id, actor_id, event_type, payload)
  VALUES (
    v_req.school_id, v_uid, 'verification_' || p_decision,
    jsonb_build_object('requestId', p_request_id, 'userId', v_req.user_id, 'note', p_note)
  );

  RETURN jsonb_build_object('requestId', p_request_id, 'decision', p_decision);
END;
$$;

-- List pending + needs_more_info for ops queue
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
      r.review_note AS "reviewNote",
      r.created_at AS "createdAt"
    FROM public.school_verification_requests r
    JOIN public.schools_v2 s ON s.id = r.school_id
    WHERE r.status IN ('pending', 'needs_more_info')
    ORDER BY r.created_at ASC
    LIMIT v_lim
  ) t;

  RETURN jsonb_build_object('items', v_items);
END;
$$;

-- ---------------------------------------------------------------------------
-- Change requests list
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ops_list_school_change_requests(
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
      c.id,
      c.user_id AS "userId",
      c.from_school_id AS "fromSchoolId",
      fs.display_name AS "fromSchoolName",
      c.to_school_id AS "toSchoolId",
      ts.display_name AS "toSchoolName",
      c.reason,
      c.status,
      c.created_at AS "createdAt"
    FROM public.school_change_requests c
    LEFT JOIN public.schools_v2 fs ON fs.id = c.from_school_id
    JOIN public.schools_v2 ts ON ts.id = c.to_school_id
    WHERE c.status = 'pending'
    ORDER BY c.created_at ASC
    LIMIT v_lim
  ) t;

  RETURN jsonb_build_object('items', v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.ops_list_school_change_requests(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_list_school_change_requests(INT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Invite code ops (hash only; plaintext never stored)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ops_list_school_invite_codes(
  p_school_id UUID DEFAULT NULL,
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

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      c.id,
      c.school_id AS "schoolId",
      s.display_name AS "schoolName",
      c.label,
      c.max_redemptions AS "maxRedemptions",
      c.redemption_count AS "redemptionCount",
      c.expires_at AS "expiresAt",
      c.disabled_at AS "disabledAt",
      c.created_at AS "createdAt"
    FROM public.school_invite_codes c
    JOIN public.schools_v2 s ON s.id = c.school_id
    WHERE (p_school_id IS NULL OR c.school_id = p_school_id)
    ORDER BY c.created_at DESC
    LIMIT v_lim
  ) t;

  RETURN jsonb_build_object('items', v_items);
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_create_school_invite_code(
  p_school_id UUID,
  p_code TEXT,
  p_label TEXT DEFAULT NULL,
  p_max_redemptions INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_hash TEXT;
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_app_moderator() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_code IS NULL OR btrim(p_code) = '' THEN RAISE EXCEPTION 'VALIDATION'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.schools_v2 WHERE id = p_school_id AND status = 'active') THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  v_hash := encode(digest(btrim(p_code), 'sha256'), 'hex');

  INSERT INTO public.school_invite_codes (school_id, code_hash, label, max_redemptions)
  VALUES (p_school_id, v_hash, p_label, p_max_redemptions)
  RETURNING id INTO v_id;

  INSERT INTO public.school_audit_events (school_id, actor_id, event_type, payload)
  VALUES (
    p_school_id, v_uid, 'invite_code_created',
    jsonb_build_object('codeId', v_id, 'label', p_label)
  );

  -- Never return plaintext or hash
  RETURN jsonb_build_object('id', v_id, 'schoolId', p_school_id, 'label', p_label);
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_disable_school_invite_code(p_code_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.school_invite_codes%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_app_moderator() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  SELECT * INTO v_row FROM public.school_invite_codes WHERE id = p_code_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  UPDATE public.school_invite_codes
  SET disabled_at = COALESCE(disabled_at, now())
  WHERE id = p_code_id;

  INSERT INTO public.school_audit_events (school_id, actor_id, event_type, payload)
  VALUES (v_row.school_id, v_uid, 'invite_code_disabled', jsonb_build_object('codeId', p_code_id));

  RETURN jsonb_build_object('id', p_code_id, 'disabled', true);
END;
$$;

REVOKE ALL ON FUNCTION public.ops_list_school_invite_codes(UUID, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ops_create_school_invite_code(UUID, TEXT, TEXT, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ops_disable_school_invite_code(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_list_school_invite_codes(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_create_school_invite_code(UUID, TEXT, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_disable_school_invite_code(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- School audit list (ops)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ops_list_school_audit_events(
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

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      e.id,
      e.school_id AS "schoolId",
      s.display_name AS "schoolName",
      e.actor_id AS "actorId",
      e.event_type AS "eventType",
      e.payload,
      e.created_at AS "createdAt"
    FROM public.school_audit_events e
    LEFT JOIN public.schools_v2 s ON s.id = e.school_id
    ORDER BY e.created_at DESC
    LIMIT v_lim
  ) t;

  RETURN jsonb_build_object('items', v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.ops_list_school_audit_events(INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_list_school_audit_events(INT) TO authenticated;

-- List active schools for change-request picker (no student directory)
CREATE OR REPLACE FUNCTION public.list_active_schools_for_change()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_items JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  -- Only verified or pending_change may see school names for transfer (not a directory product)
  IF NOT EXISTS (
    SELECT 1 FROM public.school_memberships m
    WHERE m.user_id = v_uid AND m.status IN ('verified', 'pending_change')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id, 'displayName', s.display_name, 'slug', s.slug
  ) ORDER BY s.display_name), '[]'::jsonb)
  INTO v_items
  FROM public.schools_v2 s
  WHERE s.status = 'active';

  RETURN jsonb_build_object('items', v_items);
END;
$$;

REVOKE ALL ON FUNCTION public.list_active_schools_for_change() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_active_schools_for_change() TO authenticated;
