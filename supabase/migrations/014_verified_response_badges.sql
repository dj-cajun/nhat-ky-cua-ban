-- 6.5단계: 주홍 배지 위조 방어 — Outbox + badge state RPC + Broadcast RLS
-- 013 수정 금지. acknowledge / respond 는 여기서 REPLACE 로 outbox 연동.

-- ---------------------------------------------------------------------------
-- 1) realtime_outbox (clients: no access)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.realtime_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.circle_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS realtime_outbox_undelivered_idx
  ON public.realtime_outbox (created_at)
  WHERE delivered_at IS NULL;

ALTER TABLE public.realtime_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS realtime_outbox_deny_all ON public.realtime_outbox;
CREATE POLICY realtime_outbox_deny_all ON public.realtime_outbox
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON public.realtime_outbox FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) enqueue helper (SECURITY DEFINER, internal)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_circle_response_verified(
  p_circle_id UUID,
  p_post_id UUID,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.realtime_outbox (
    event_type, circle_id, post_id, user_id, payload
  )
  VALUES (
    'circle_response_verified',
    p_circle_id,
    p_post_id,
    p_user_id,
    jsonb_build_object(
      'type', 'circle_response_verified',
      'circleId', p_circle_id,
      'postId', p_post_id,
      'userId', p_user_id,
      'responded', true
    )
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_circle_response_verified(UUID, UUID, UUID)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_circle_post_closed(
  p_circle_id UUID,
  p_post_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.realtime_outbox (
    event_type, circle_id, post_id, user_id, payload
  )
  VALUES (
    'circle_post_closed',
    p_circle_id,
    p_post_id,
    NULL,
    jsonb_build_object(
      'type', 'circle_post_closed',
      'circleId', p_circle_id,
      'postId', p_post_id
    )
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_circle_post_closed(UUID, UUID)
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) acknowledge_circle_notice — store then outbox (no external call)
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
  IF NOT public.is_circle_member(v_post.circle_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  INSERT INTO public.circle_responses (post_id, user_id, response_type, option_id, created_at, updated_at)
  VALUES (p_post_id, v_uid, 'acknowledged', NULL, now(), now())
  ON CONFLICT (post_id, user_id) DO UPDATE
    SET updated_at = now(),
        response_type = 'acknowledged',
        option_id = NULL;

  -- Re-verify membership + active post before verifying badge event
  IF NOT public.is_circle_member(v_post.circle_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_post.status <> 'active' OR v_post.closes_at <= now() THEN RAISE EXCEPTION 'CONFLICT'; END IF;

  PERFORM public.enqueue_circle_response_verified(v_post.circle_id, p_post_id, v_uid);

  RETURN jsonb_build_object('responded', true, 'postId', p_post_id);
END;
$$;

REVOKE ALL ON FUNCTION public.acknowledge_circle_notice(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_circle_notice(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) respond_circle_poll — store then outbox
-- ---------------------------------------------------------------------------
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
  IF NOT public.is_circle_member(v_post.circle_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

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

  IF NOT public.is_circle_member(v_post.circle_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
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

-- ---------------------------------------------------------------------------
-- 5) close_circle_post — enqueue closed event (optional broadcast)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 6) get_active_post_badge_states — responded user ids only (no choices)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_post_badge_states(target_circle_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_post public.circle_posts%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_circle_member(target_circle_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_post
  FROM public.circle_posts p
  WHERE p.circle_id = target_circle_id
    AND p.status = 'active'
    AND p.closes_at > now()
  ORDER BY p.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'postId', NULL,
      'respondedUserIds', '[]'::jsonb
    );
  END IF;

  RETURN jsonb_build_object(
    'postId', v_post.id,
    'respondedUserIds', COALESCE((
      SELECT jsonb_agg(r.user_id ORDER BY r.user_id)
      FROM public.circle_responses r
      INNER JOIN public.circle_members cm
        ON cm.circle_id = v_post.circle_id
       AND cm.user_id = r.user_id
       AND cm.status = 'active'
      WHERE r.post_id = v_post.id
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_post_badge_states(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_post_badge_states(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) Outbox claim / mark for Edge Function (service role)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_realtime_outbox(p_limit INTEGER DEFAULT 20)
RETURNS SETOF public.realtime_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.realtime_outbox o
  SET attempt_count = o.attempt_count + 1
  WHERE o.id IN (
    SELECT id FROM public.realtime_outbox
    WHERE delivered_at IS NULL
    ORDER BY created_at
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 100))
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_realtime_outbox(INTEGER) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_realtime_outbox_delivered(p_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.realtime_outbox
  SET delivered_at = now()
  WHERE id = ANY (p_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_realtime_outbox_delivered(UUID[]) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8) Broadcast RLS — members receive; clients must not INSERT verified events
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "deny circle broadcast until phase later" ON realtime.messages;
DROP POLICY IF EXISTS "circle members can receive broadcast" ON realtime.messages;
CREATE POLICY "circle members can receive broadcast"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND public.is_active_circle_member_from_topic(
    (SELECT realtime.topic()),
    (SELECT auth.uid())
  )
);

-- No INSERT policy for authenticated on broadcast → client spoof blocked.
-- Presence INSERT remains the 012 policy. service_role bypasses RLS for Edge publish.
