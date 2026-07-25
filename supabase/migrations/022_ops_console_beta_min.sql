-- =============================================================================
-- 022 — Phase D minimal beta ops console (forward-only)
-- Overview aggregates · membership suspend · school merge · fake-verif report
-- Role-aware actions. No diary/message browse. No service-role client.
-- Does not edit 007–021.
-- =============================================================================

-- Aggregate visit counter only (no per-user visit history for ops UI)
CREATE TABLE IF NOT EXISTS public.ops_metric_counters (
  metric_key TEXT NOT NULL,
  metric_day DATE NOT NULL,
  value BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (metric_key, metric_day)
);

ALTER TABLE public.ops_metric_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ops_metric_counters_deny ON public.ops_metric_counters;
CREATE POLICY ops_metric_counters_deny ON public.ops_metric_counters
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.ops_metric_counters FROM anon, authenticated;

-- Reports may target a school verification request (fake-code / impersonation)
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_target_type_check;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_target_type_check
  CHECK (target_type IN (
    'profile', 'diary_entry', 'photo', 'guestbook_entry',
    'circle_post', 'message', 'anonymous_post', 'school_verification'
  ));

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_moderators m
    WHERE m.user_id = auth.uid() AND m.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.ops_allowed_actions()
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT m.role INTO v_role
  FROM public.app_moderators m
  WHERE m.user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  -- Moderator: day-to-day beta ops. Admin: + school merge.
  IF v_role = 'admin' THEN
    RETURN ARRAY[
      'overview_read',
      'verification_review',
      'change_review',
      'invite_codes',
      'membership_suspend',
      'mixed_resolve',
      'reports_moderate',
      'school_audit_read',
      'school_merge'
    ];
  END IF;

  RETURN ARRAY[
    'overview_read',
    'verification_review',
    'change_review',
    'invite_codes',
    'membership_suspend',
    'mixed_resolve',
    'reports_moderate',
    'school_audit_read'
  ];
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_ops_action(p_action TEXT)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT (p_action = ANY (public.ops_allowed_actions())) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
END;
$$;

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
  v_actions TEXT[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT m.role INTO v_role
  FROM public.app_moderators m
  WHERE m.user_id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'isModerator', false,
      'role', NULL,
      'allowedActions', '[]'::jsonb
    );
  END IF;

  v_actions := public.ops_allowed_actions();
  RETURN jsonb_build_object(
    'isModerator', true,
    'role', v_role,
    'allowedActions', to_jsonb(v_actions)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_app_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ops_allowed_actions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assert_ops_action(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_allowed_actions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assert_ops_action(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Overview aggregates (no PII lists, no diary/message bodies)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ops_get_overview_metrics()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today DATE := (timezone('utc', now()))::date;
BEGIN
  PERFORM public.assert_ops_action('overview_read');

  RETURN jsonb_build_object(
    'totalUsers', (SELECT COUNT(*)::INT FROM public.app_profiles),
    'activeUsers1d', (
      SELECT COUNT(DISTINCT p.user_id)::INT
      FROM public.circle_presence p
      WHERE p.last_heartbeat >= (now() - interval '1 day')
    ),
    'activeUsers7d', (
      SELECT COUNT(DISTINCT p.user_id)::INT
      FROM public.circle_presence p
      WHERE p.last_heartbeat >= (now() - interval '7 day')
    ),
    'activeUsers30d', (
      SELECT COUNT(DISTINCT p.user_id)::INT
      FROM public.circle_presence p
      WHERE p.last_heartbeat >= (now() - interval '30 day')
    ),
    'schoolVerified', (
      SELECT COUNT(*)::INT FROM public.school_memberships WHERE status = 'verified'
    ),
    'schoolPending', (
      SELECT COUNT(*)::INT FROM public.school_memberships
      WHERE status IN ('pending', 'needs_more_info')
    ),
    'circlesOpened', (
      SELECT COUNT(*)::INT FROM public.circles WHERE status = 'open'
    ),
    'circlesActive7d', (
      SELECT COUNT(DISTINCT p.circle_id)::INT
      FROM public.circle_presence p
      WHERE p.last_heartbeat >= (now() - interval '7 day')
    ),
    'diaryEntriesToday', (
      SELECT COUNT(*)::INT
      FROM public.diary_entries e
      WHERE e.entry_date = v_today
        AND (e.deleted_at IS NULL)
    ),
    'friendDiaryVisitsToday', (
      SELECT COALESCE((
        SELECT c.value::INT FROM public.ops_metric_counters c
        WHERE c.metric_key = 'friend_diary_visit' AND c.metric_day = v_today
      ), 0)
    ),
    'openReports', (
      SELECT COUNT(*)::INT FROM public.reports
      WHERE status IN ('submitted', 'reviewing')
    ),
    'openMixedIncidents', (
      SELECT COUNT(*)::INT FROM public.circle_school_incidents
      WHERE status = 'open'
    ),
    'note', 'Aggregates only — not personal surveillance. Presence = circle heartbeat proxy.'
  );
END;
$$;

-- Client may bump visit counter when opening a friend diary (aggregate only)
CREATE OR REPLACE FUNCTION public.record_friend_diary_visit()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_day DATE := (timezone('utc', now()))::date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  INSERT INTO public.ops_metric_counters (metric_key, metric_day, value)
  VALUES ('friend_diary_visit', v_day, 1)
  ON CONFLICT (metric_key, metric_day)
  DO UPDATE SET value = public.ops_metric_counters.value + 1;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.ops_get_overview_metrics() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_friend_diary_visit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_get_overview_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_friend_diary_visit() TO authenticated;

-- ---------------------------------------------------------------------------
-- Membership suspend / reinstate (school boundary, not account ban)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ops_set_school_membership_status(
  p_user_id UUID,
  p_school_id UUID,
  p_status TEXT,
  p_note TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_prev TEXT;
BEGIN
  PERFORM public.assert_ops_action('membership_suspend');
  IF p_status NOT IN ('suspended', 'verified') THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  IF p_note IS NULL OR btrim(p_note) = '' THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  SELECT status INTO v_prev
  FROM public.school_memberships
  WHERE user_id = p_user_id AND school_id = p_school_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF p_status = 'suspended' THEN
    UPDATE public.school_memberships
    SET status = 'suspended',
        suspended_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id AND school_id = p_school_id;
  ELSE
    -- reinstate only from suspended
    IF v_prev <> 'suspended' THEN RAISE EXCEPTION 'CONFLICT'; END IF;
    UPDATE public.school_memberships
    SET status = 'verified',
        suspended_at = NULL,
        verified_at = COALESCE(verified_at, now()),
        updated_at = now()
    WHERE user_id = p_user_id AND school_id = p_school_id;
  END IF;

  INSERT INTO public.school_audit_events (school_id, actor_id, event_type, payload)
  VALUES (
    p_school_id, v_uid, 'membership_' || p_status,
    jsonb_build_object(
      'userId', p_user_id,
      'fromStatus', v_prev,
      'toStatus', p_status,
      'note', btrim(p_note)
    )
  );

  RETURN jsonb_build_object(
    'userId', p_user_id,
    'schoolId', p_school_id,
    'status', p_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ops_set_school_membership_status(UUID, UUID, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_set_school_membership_status(UUID, UUID, TEXT, TEXT)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- Flag fake school verification → report + needs_more_info
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ops_flag_fake_school_verification(
  p_request_id UUID,
  p_note TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_req public.school_verification_requests%ROWTYPE;
  v_report_id UUID;
BEGIN
  PERFORM public.assert_ops_action('verification_review');
  IF p_note IS NULL OR btrim(p_note) = '' THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  SELECT * INTO v_req
  FROM public.school_verification_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_req.status NOT IN ('pending', 'needs_more_info', 'approved') THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  INSERT INTO public.reports (
    reporter_id, target_type, target_id, reason, details, content_snapshot, status
  )
  VALUES (
    v_uid,
    'school_verification',
    p_request_id,
    'impersonation',
    btrim(p_note),
    jsonb_build_object(
      'kind', 'school_verification',
      'requestId', p_request_id,
      'userId', v_req.user_id,
      'schoolId', v_req.school_id,
      'method', v_req.method
    ),
    'reviewing'
  )
  ON CONFLICT (reporter_id, target_type, target_id) DO UPDATE
    SET details = EXCLUDED.details,
        status = 'reviewing',
        reviewed_at = now()
  RETURNING id INTO v_report_id;

  UPDATE public.school_verification_requests
  SET status = 'needs_more_info',
      reviewer_id = v_uid,
      review_note = btrim(p_note),
      reviewed_at = now()
  WHERE id = p_request_id;

  UPDATE public.school_memberships
  SET status = 'needs_more_info', updated_at = now()
  WHERE school_id = v_req.school_id
    AND user_id = v_req.user_id
    AND status IN ('pending', 'needs_more_info', 'verified');

  INSERT INTO public.school_audit_events (school_id, actor_id, event_type, payload)
  VALUES (
    v_req.school_id, v_uid, 'verification_flagged_fake',
    jsonb_build_object(
      'requestId', p_request_id,
      'reportId', v_report_id,
      'userId', v_req.user_id,
      'note', btrim(p_note)
    )
  );

  RETURN jsonb_build_object(
    'requestId', p_request_id,
    'reportId', v_report_id,
    'status', 'needs_more_info'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ops_flag_fake_school_verification(UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_flag_fake_school_verification(UUID, TEXT)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- Duplicate school merge (admin only) — circles get school_id remapped;
-- memberships never invent circle joins.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ops_merge_schools(
  p_keep_school_id UUID,
  p_absorb_school_id UUID,
  p_note TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_moved_circles INT;
  v_moved_codes INT;
BEGIN
  PERFORM public.assert_ops_action('school_merge');
  IF p_note IS NULL OR btrim(p_note) = '' THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  IF p_keep_school_id = p_absorb_school_id THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.schools_v2 WHERE id = p_keep_school_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.schools_v2 WHERE id = p_absorb_school_id
  ) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  -- Prefer keep-school membership when both exist
  UPDATE public.school_memberships AS absorb
  SET status = 'expired', updated_at = now()
  WHERE absorb.school_id = p_absorb_school_id
    AND EXISTS (
      SELECT 1 FROM public.school_memberships k
      WHERE k.school_id = p_keep_school_id AND k.user_id = absorb.user_id
    );

  UPDATE public.school_memberships AS absorb
  SET school_id = p_keep_school_id, updated_at = now()
  WHERE absorb.school_id = p_absorb_school_id
    AND absorb.status <> 'expired';

  UPDATE public.school_invite_codes
  SET school_id = p_keep_school_id
  WHERE school_id = p_absorb_school_id;
  GET DIAGNOSTICS v_moved_codes = ROW_COUNT;

  UPDATE public.circles
  SET school_id = p_keep_school_id
  WHERE school_id = p_absorb_school_id;
  GET DIAGNOSTICS v_moved_circles = ROW_COUNT;

  UPDATE public.schools_v2
  SET status = 'archived'
  WHERE id = p_absorb_school_id;

  INSERT INTO public.school_audit_events (school_id, actor_id, event_type, payload)
  VALUES (
    p_keep_school_id, v_uid, 'school_merged',
    jsonb_build_object(
      'absorbSchoolId', p_absorb_school_id,
      'movedCircles', v_moved_circles,
      'movedCodes', v_moved_codes,
      'note', btrim(p_note)
    )
  );

  RETURN jsonb_build_object(
    'keepSchoolId', p_keep_school_id,
    'absorbSchoolId', p_absorb_school_id,
    'movedCircles', v_moved_circles,
    'movedCodes', v_moved_codes,
    'absorbStatus', 'archived'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ops_merge_schools(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_merge_schools(UUID, UUID, TEXT) TO authenticated;
