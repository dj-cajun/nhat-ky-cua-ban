-- 6단계: 공지·투표 RPC · 응답 정합성 · RLS harden
-- 기존 007 circle_posts / options / responses 진화. 007~012 수정 금지.

-- ---------------------------------------------------------------------------
-- 1) Schema evolution
-- ---------------------------------------------------------------------------
ALTER TABLE public.circle_posts
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.circle_posts DROP CONSTRAINT IF EXISTS circle_posts_status_check;
ALTER TABLE public.circle_posts
  ADD CONSTRAINT circle_posts_status_check
  CHECK (status IN ('active', 'closed', 'cancelled', 'hidden'));

ALTER TABLE public.circle_poll_options
  ADD COLUMN IF NOT EXISTS sort_order INTEGER,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.circle_poll_options o
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY post_id ORDER BY id) AS rn
  FROM public.circle_poll_options
) sub
WHERE o.id = sub.id AND o.sort_order IS NULL;

ALTER TABLE public.circle_poll_options
  ALTER COLUMN sort_order SET DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'circle_poll_options_post_sort_uidx'
  ) THEN
    ALTER TABLE public.circle_poll_options
      ADD CONSTRAINT circle_poll_options_post_sort_uidx UNIQUE (post_id, sort_order);
  END IF;
END $$;

ALTER TABLE public.circle_responses
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS response_type TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.circle_responses
SET response_type = CASE
  WHEN option_id IS NULL THEN 'acknowledged'
  ELSE 'poll_option'
END
WHERE response_type IS NULL;

ALTER TABLE public.circle_responses
  ALTER COLUMN response_type SET DEFAULT 'acknowledged',
  ALTER COLUMN response_type SET NOT NULL;

ALTER TABLE public.circle_responses DROP CONSTRAINT IF EXISTS circle_responses_type_check;
ALTER TABLE public.circle_responses
  ADD CONSTRAINT circle_responses_type_check
  CHECK (
    (response_type = 'acknowledged' AND option_id IS NULL)
    OR (response_type = 'poll_option' AND option_id IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS one_active_post_per_circle
  ON public.circle_posts(circle_id)
  WHERE status = 'active';

-- ---------------------------------------------------------------------------
-- 2) create_circle_post
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
  IF post_type NOT IN ('notice', 'poll') THEN RAISE EXCEPTION 'VALIDATION'; END IF;
  IF title IS NULL OR char_length(btrim(title)) < 1 OR char_length(title) > 80 THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  IF body IS NOT NULL AND char_length(body) > 300 THEN RAISE EXCEPTION 'VALIDATION'; END IF;
  IF closes_at <= now() THEN RAISE EXCEPTION 'VALIDATION'; END IF;
  IF closes_at > now() + INTERVAL '7 days' THEN RAISE EXCEPTION 'VALIDATION'; END IF;
  IF closes_at < now() + INTERVAL '10 minutes' THEN RAISE EXCEPTION 'VALIDATION'; END IF;

  IF NOT public.is_circle_member(target_circle_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT * INTO v_member
  FROM public.circle_members
  WHERE circle_id = target_circle_id AND user_id = v_uid AND status = 'active';

  IF v_member.role NOT IN ('admin', 'pioneer') AND COALESCE(v_member.is_pioneer, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Expire lingering active rows so the unique index can accept a new post.
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

REVOKE ALL ON FUNCTION public.create_circle_post(UUID, TEXT, TEXT, TEXT, TEXT[], TIMESTAMPTZ)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_circle_post(UUID, TEXT, TEXT, TEXT, TEXT[], TIMESTAMPTZ)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) acknowledge_circle_notice (idempotent)
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

  RETURN jsonb_build_object('responded', true, 'postId', p_post_id);
END;
$$;

REVOKE ALL ON FUNCTION public.acknowledge_circle_notice(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_circle_notice(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) respond_circle_poll (changeable before close)
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
-- 5) get_circle_post_summary — aggregates only; poll counts after respond
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_circle_post_summary(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_post public.circle_posts%ROWTYPE;
  v_mine public.circle_responses%ROWTYPE;
  v_active BOOLEAN;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;

  SELECT * INTO v_post FROM public.circle_posts WHERE id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT public.is_circle_member(v_post.circle_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  v_active := v_post.status = 'active' AND v_post.closes_at > now();

  SELECT * INTO v_mine
  FROM public.circle_responses
  WHERE post_id = p_post_id AND user_id = v_uid;

  IF v_post.type = 'notice' THEN
    RETURN jsonb_build_object(
      'postId', v_post.id,
      'postType', 'notice',
      'status', v_post.status,
      'isActive', v_active,
      'totalResponded', (SELECT COUNT(*) FROM public.circle_responses WHERE post_id = p_post_id),
      'currentUserResponded', v_mine.user_id IS NOT NULL,
      'options', '[]'::jsonb
    );
  END IF;

  IF v_mine.user_id IS NULL AND v_active THEN
    RETURN jsonb_build_object(
      'postId', v_post.id,
      'postType', 'poll',
      'status', v_post.status,
      'isActive', v_active,
      'totalResponded', NULL,
      'currentUserResponded', false,
      'currentUserOptionId', NULL,
      'options', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', o.id, 'label', o.label, 'count', NULL, 'sortOrder', o.sort_order
        ) ORDER BY o.sort_order)
        FROM public.circle_poll_options o WHERE o.post_id = p_post_id
      ), '[]'::jsonb)
    );
  END IF;

  RETURN jsonb_build_object(
    'postId', v_post.id,
    'postType', 'poll',
    'status', v_post.status,
    'isActive', v_active,
    'totalResponded', (SELECT COUNT(*) FROM public.circle_responses WHERE post_id = p_post_id),
    'currentUserResponded', v_mine.user_id IS NOT NULL,
    'currentUserOptionId', v_mine.option_id,
    'options', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', o.id,
        'label', o.label,
        'count', (SELECT COUNT(*) FROM public.circle_responses r WHERE r.option_id = o.id),
        'sortOrder', o.sort_order
      ) ORDER BY o.sort_order)
      FROM public.circle_poll_options o WHERE o.post_id = p_post_id
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_circle_post_summary(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_circle_post_summary(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_poll_summary(p_post_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.get_circle_post_summary(p_post_id);
$$;

-- ---------------------------------------------------------------------------
-- 6) close_circle_post
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
END;
$$;

REVOKE ALL ON FUNCTION public.close_circle_post(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_circle_post(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) RLS harden
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS circle_posts_insert ON public.circle_posts;
DROP POLICY IF EXISTS circle_responses_insert ON public.circle_responses;
DROP POLICY IF EXISTS circle_responses_select ON public.circle_responses;

CREATE POLICY circle_responses_select_none ON public.circle_responses
  FOR SELECT TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON public.circle_posts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.circle_poll_options FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.circle_responses FROM anon, authenticated;
REVOKE SELECT ON public.circle_responses FROM anon, authenticated;

GRANT SELECT ON public.circle_posts TO authenticated;
GRANT SELECT ON public.circle_poll_options TO authenticated;
