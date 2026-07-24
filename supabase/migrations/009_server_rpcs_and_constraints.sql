-- 기술 지침서 §6§7§8§10 — 서버 검증 RPC + draft_members + 활성 공지 유니크

-- 초안 멤버 (정식 circles 생성 전)
CREATE TABLE IF NOT EXISTS circle_draft_members (
  draft_id UUID NOT NULL REFERENCES circle_drafts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_profiles(id),
  member_type TEXT NOT NULL CHECK (member_type IN ('proposer', 'invitee')),
  response_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (response_status IN ('pending', 'accepted', 'declined', 'expired')),
  responded_at TIMESTAMPTZ,
  PRIMARY KEY (draft_id, user_id)
);

ALTER TABLE circle_drafts
  ADD COLUMN IF NOT EXISTS proposed_name TEXT,
  ADD COLUMN IF NOT EXISTS proposer_id UUID REFERENCES app_profiles(id),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'opened', 'cancelled'));

ALTER TABLE circle_members
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'left', 'removed'));

ALTER TABLE diary_entries
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS client_request_id UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS diary_entries_client_request_uidx
  ON diary_entries(client_request_id)
  WHERE client_request_id IS NOT NULL;

ALTER TABLE circle_posts
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed', 'hidden'));

CREATE UNIQUE INDEX IF NOT EXISTS one_active_circle_post
  ON circle_posts(circle_id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  expo_push_token TEXT NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  disabled_at TIMESTAMPTZ,
  UNIQUE (user_id, device_id)
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- §8 is_circle_member — search_path 고정
CREATE OR REPLACE FUNCTION public.is_circle_member(target_circle_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.circle_members cm
    WHERE cm.circle_id = target_circle_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_circle_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_circle_member(UUID) TO authenticated;

-- §6 open_circle_from_draft
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

  INSERT INTO public.circles (name, description, color, symbol, created_by, status, opened_at)
  VALUES (
    COALESCE(v_draft.proposed_name, v_draft.name),
    '',
    '#7C9A8E',
    '○',
    COALESCE(v_draft.proposer_id, v_draft.inviter_id),
    'open',
    now()
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

  RETURN v_circle_id;
END;
$$;

REVOKE ALL ON FUNCTION public.open_circle_from_draft(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_circle_from_draft(UUID) TO authenticated;

-- §7 recommend_and_maybe_approve
CREATE OR REPLACE FUNCTION public.recommend_join_request(
  p_request_id UUID,
  p_decision TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_req public.circle_join_requests%ROWTYPE;
  v_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_decision NOT IN ('recommended', 'unknown', 'later') THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  SELECT * INTO v_req
  FROM public.circle_join_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  IF NOT public.is_circle_member(v_req.circle_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF auth.uid() = v_req.applicant_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.circle_recommendations
  SET status = p_decision
  WHERE join_request_id = p_request_id
    AND recommender_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF p_decision <> 'recommended' THEN
    RETURN v_req.status;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.circle_recommendations
  WHERE join_request_id = p_request_id
    AND status = 'recommended';

  IF v_count >= 3 THEN
    INSERT INTO public.circle_members (circle_id, user_id, role, is_pioneer, status)
    VALUES (v_req.circle_id, v_req.applicant_id, 'member', false, 'active')
    ON CONFLICT DO NOTHING;

    UPDATE public.circle_join_requests
    SET status = 'approved'
    WHERE id = p_request_id;

    RETURN 'approved';
  END IF;

  RETURN 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.recommend_join_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recommend_join_request(UUID, TEXT) TO authenticated;

-- 투표 집계만 공개
CREATE OR REPLACE FUNCTION public.get_poll_summary(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_circle UUID;
  v_result JSONB;
BEGIN
  SELECT circle_id INTO v_circle FROM public.circle_posts WHERE id = p_post_id;
  IF v_circle IS NULL OR NOT public.is_circle_member(v_circle) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT jsonb_build_object(
    'totalResponded', (SELECT COUNT(*) FROM public.circle_responses WHERE post_id = p_post_id),
    'options', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', o.id,
        'count', (SELECT COUNT(*) FROM public.circle_responses r WHERE r.option_id = o.id)
      ))
      FROM public.circle_poll_options o
      WHERE o.post_id = p_post_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_poll_summary(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_poll_summary(UUID) TO authenticated;

-- 가명 공개 뷰 (작성자 ID 숨김)
CREATE OR REPLACE VIEW public.anonymous_posts_public
WITH (security_invoker = true)
AS
SELECT
  ap.id,
  ap.circle_id,
  a.alias_name,
  ap.body,
  ap.created_at
FROM public.anonymous_posts ap
JOIN public.alias_profiles a ON a.id = ap.alias_profile_id
WHERE ap.hidden = false;
