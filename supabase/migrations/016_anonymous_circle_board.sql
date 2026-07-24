-- 8단계: 가명 게시판
-- 015 이하 수정 금지. app_profiles 기준.

-- ---------------------------------------------------------------------------
-- 1) circle_aliases (canonical fixed per circle)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.circle_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  alias_seed_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id),
  UNIQUE (circle_id, alias_name)
);

ALTER TABLE public.circle_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS circle_aliases_deny ON public.circle_aliases;
CREATE POLICY circle_aliases_deny ON public.circle_aliases
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.circle_aliases FROM anon, authenticated;

-- Migrate existing alias_profiles → circle_aliases (ignore expires)
INSERT INTO public.circle_aliases (id, circle_id, user_id, alias_name, created_at)
SELECT ap.id, ap.circle_id, ap.user_id, ap.alias_name, ap.assigned_at
FROM public.alias_profiles ap
ON CONFLICT (circle_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) anonymous_posts evolution
-- ---------------------------------------------------------------------------
ALTER TABLE public.anonymous_posts
  ADD COLUMN IF NOT EXISTS alias_id UUID REFERENCES public.circle_aliases(id),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_request_id UUID;

ALTER TABLE public.anonymous_posts DROP CONSTRAINT IF EXISTS anonymous_posts_status_check;
ALTER TABLE public.anonymous_posts
  ADD CONSTRAINT anonymous_posts_status_check
  CHECK (status IN ('active', 'deleted', 'removed'));

UPDATE public.anonymous_posts ap
SET alias_id = ca.id
FROM public.circle_aliases ca
WHERE ap.alias_id IS NULL
  AND ca.circle_id = ap.circle_id
  AND ca.user_id = ap.author_user_id;

UPDATE public.anonymous_posts
SET status = 'removed'
WHERE hidden = true AND status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS anonymous_posts_client_request_uidx
  ON public.anonymous_posts (author_user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS anonymous_posts_circle_active_idx
  ON public.anonymous_posts (circle_id, created_at DESC)
  WHERE status = 'active';

-- Clients must not read raw table (author_user_id leak risk)
DROP POLICY IF EXISTS anonymous_posts_select ON public.anonymous_posts;
DROP POLICY IF EXISTS anonymous_posts_insert ON public.anonymous_posts;
CREATE POLICY anonymous_posts_deny ON public.anonymous_posts
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.anonymous_posts FROM anon, authenticated;

-- Harden alias_profiles direct reads of user_id mapping
DROP POLICY IF EXISTS alias_profiles_member_select ON public.alias_profiles;
CREATE POLICY alias_profiles_deny_select ON public.alias_profiles
  FOR SELECT TO authenticated USING (false);

-- ---------------------------------------------------------------------------
-- 3) Safe alias word lists + generator
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_circle_alias_name(p_circle_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_adj TEXT[] := ARRAY[
    'Quiet','Slow','Soft','Small','Calm','Gentle','Bright','Warm',
    'Cool','Silent','Pale','Kind','Still','Light','Clear','Mild'
  ];
  v_noun TEXT[] := ARRAY[
    'Comet','Wave','Lantern','Cloud','Stone','River','Pine','Ember',
    'Moss','Drift','Harbor','Meadow','Pebble','Breeze','Grove','Dusk'
  ];
  v_name TEXT;
  v_i INT;
BEGIN
  FOR v_i IN 1..40 LOOP
    v_name := v_adj[1 + floor(random() * array_length(v_adj, 1))::int]
      || ' '
      || v_noun[1 + floor(random() * array_length(v_noun, 1))::int];
    IF NOT EXISTS (
      SELECT 1 FROM public.circle_aliases ca
      WHERE ca.circle_id = p_circle_id AND ca.alias_name = v_name
    ) THEN
      RETURN v_name;
    END IF;
  END LOOP;
  -- Fallback uniqueness
  RETURN 'Quiet Star ' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
END;
$$;

REVOKE ALL ON FUNCTION public.generate_circle_alias_name(UUID) FROM PUBLIC, anon, authenticated;

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
  IF NOT public.is_circle_member(target_circle_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

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

  -- Keep legacy alias_profiles in sync for older views
  INSERT INTO public.alias_profiles (id, circle_id, user_id, alias_name, assigned_at, expires_at)
  VALUES (v_row.id, target_circle_id, v_uid, v_row.alias_name, now(), now() + INTERVAL '10 years')
  ON CONFLICT (circle_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('aliasName', v_row.alias_name, 'aliasId', v_row.id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_circle_alias(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_circle_alias(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Body validation
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_anonymous_post_body(p_body TEXT)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_trim TEXT := btrim(COALESCE(p_body, ''));
BEGIN
  IF char_length(v_trim) < 1 OR char_length(v_trim) > 300 THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  IF v_trim ~* '(https?://|www\.|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})' THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  -- Phone-like sequences (7+ digits with optional separators)
  IF regexp_replace(v_trim, '[^0-9]', '', 'g') ~ '[0-9]{7,}' THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  -- Excessive character repetition
  IF v_trim ~ '(.)\1{9,}' THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) create_anonymous_post
-- ---------------------------------------------------------------------------
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
  IF NOT public.is_circle_member(target_circle_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

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

REVOKE ALL ON FUNCTION public.create_anonymous_post(UUID, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_anonymous_post(UUID, TEXT, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) get_anonymous_circle_posts (cursor + block filter)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_anonymous_circle_posts(
  target_circle_id UUID,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_lim INT := GREATEST(1, LEAST(COALESCE(p_limit, 20), 20));
  v_items JSONB;
  v_last JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  PERFORM public.assert_not_suspended();
  IF NOT public.is_circle_member(target_circle_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.created_at DESC, x.id DESC), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      ap.id,
      ca.alias_name AS "aliasName",
      ap.body,
      ap.created_at AS "createdAt",
      (ap.author_user_id = v_uid) AS "isMine"
    FROM public.anonymous_posts ap
    INNER JOIN public.circle_aliases ca ON ca.id = ap.alias_id
    WHERE ap.circle_id = target_circle_id
      AND ap.status = 'active'
      AND NOT public.has_block_relation(v_uid, ap.author_user_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.hidden_content hc
        WHERE hc.user_id = v_uid
          AND hc.target_type = 'anonymous_post'
          AND hc.target_id = ap.id
      )
      AND (
        p_cursor_created_at IS NULL
        OR (ap.created_at, ap.id) < (p_cursor_created_at, p_cursor_id)
      )
    ORDER BY ap.created_at DESC, ap.id DESC
    LIMIT v_lim
  ) x;

  IF jsonb_array_length(v_items) = v_lim THEN
    v_last := v_items -> (v_lim - 1);
    RETURN jsonb_build_object(
      'items', v_items,
      'nextCursor', jsonb_build_object(
        'createdAt', v_last->>'createdAt',
        'id', v_last->>'id'
      )
    );
  END IF;

  RETURN jsonb_build_object('items', v_items, 'nextCursor', NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.get_anonymous_circle_posts(UUID, TIMESTAMPTZ, UUID, INTEGER)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_anonymous_circle_posts(UUID, TIMESTAMPTZ, UUID, INTEGER)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_anonymous_circle_preview(target_circle_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.get_anonymous_circle_posts(target_circle_id, NULL, NULL, 3);
$$;

REVOKE ALL ON FUNCTION public.get_anonymous_circle_preview(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_anonymous_circle_preview(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) delete_anonymous_post (author soft-delete)
-- ---------------------------------------------------------------------------
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
  IF v_post.status <> 'active' THEN RETURN; END IF;

  UPDATE public.anonymous_posts
  SET status = 'deleted', deleted_at = now(), updated_at = now(), hidden = true
  WHERE id = p_post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_anonymous_post(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_anonymous_post(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8) block_anonymous_post_author (no name disclosed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_anonymous_post_author(p_post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_author UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  PERFORM public.assert_not_suspended();

  SELECT author_user_id INTO v_author
  FROM public.anonymous_posts
  WHERE id = p_post_id AND status = 'active';

  IF v_author IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_author = v_uid THEN RAISE EXCEPTION 'VALIDATION'; END IF;

  -- Must be able to see the post (member + not already blocked oddly)
  IF NOT public.is_circle_member(
    (SELECT circle_id FROM public.anonymous_posts WHERE id = p_post_id)
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM public.block_user(v_author);
END;
$$;

REVOKE ALL ON FUNCTION public.block_anonymous_post_author(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.block_anonymous_post_author(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 9) resolve_anonymous_author — report-backed moderators only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_anonymous_author(
  p_post_id UUID,
  p_moderation_case_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_post public.anonymous_posts%ROWTYPE;
  v_report public.reports%ROWTYPE;
BEGIN
  IF NOT public.is_app_moderator() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_reason IS NULL OR char_length(btrim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  SELECT * INTO v_post FROM public.anonymous_posts WHERE id = p_post_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  SELECT * INTO v_report FROM public.reports WHERE id = p_moderation_case_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_report.target_type <> 'anonymous_post' OR v_report.target_id <> p_post_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM public.write_admin_audit(
    'resolve_anonymous_author',
    'anonymous_post',
    p_post_id,
    btrim(p_reason),
    jsonb_build_object(
      'moderationCaseId', p_moderation_case_id,
      'authorUserId', v_post.author_user_id
    )
  );

  RETURN jsonb_build_object(
    'postId', v_post.id,
    'authorUserId', v_post.author_user_id,
    'circleId', v_post.circle_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_anonymous_author(UUID, UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_anonymous_author(UUID, UUID, TEXT)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 10) Enrich report snapshot for anonymous_post
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.build_report_snapshot(
  p_target_type TEXT,
  p_target_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_snap JSONB;
BEGIN
  IF p_target_type = 'profile' THEN
    SELECT jsonb_build_object(
      'authorId', p.id,
      'displayName', p.display_name,
      'createdAt', p.created_at
    ) INTO v_snap
    FROM public.app_profiles p WHERE p.id = p_target_id;
  ELSIF p_target_type = 'diary_entry' THEN
    SELECT jsonb_build_object(
      'authorId', e.user_id,
      'body', COALESCE(e.short_text, e.ten_char_text, ''),
      'mood', e.mood,
      'entryDate', e.entry_date,
      'createdAt', e.created_at,
      'updatedAt', e.updated_at,
      'visibilityMode', e.visibility_mode
    ) INTO v_snap
    FROM public.diary_entries e WHERE e.id = p_target_id;
  ELSIF p_target_type = 'guestbook_entry' THEN
    SELECT jsonb_build_object(
      'authorId', g.author_user_id,
      'ownerId', g.owner_user_id,
      'body', g.body,
      'createdAt', g.created_at
    ) INTO v_snap
    FROM public.guestbook_entries g WHERE g.id = p_target_id;
  ELSIF p_target_type = 'circle_post' THEN
    SELECT jsonb_build_object(
      'authorId', p.created_by,
      'circleId', p.circle_id,
      'body', p.title,
      'postBody', p.body,
      'createdAt', p.created_at
    ) INTO v_snap
    FROM public.circle_posts p WHERE p.id = p_target_id;
  ELSIF p_target_type = 'message' THEN
    SELECT jsonb_build_object(
      'authorId', m.sender_id,
      'recipientId', m.recipient_id,
      'circleId', m.circle_id,
      'body', m.body,
      'createdAt', m.created_at
    ) INTO v_snap
    FROM public.direct_messages m WHERE m.id = p_target_id;
  ELSIF p_target_type = 'anonymous_post' THEN
    SELECT jsonb_build_object(
      'postId', a.id,
      'circleId', a.circle_id,
      'authorUserId', a.author_user_id,
      'aliasName', COALESCE(ca.alias_name, 'Unknown'),
      'body', a.body,
      'createdAt', a.created_at
    ) INTO v_snap
    FROM public.anonymous_posts a
    LEFT JOIN public.circle_aliases ca ON ca.id = a.alias_id
    WHERE a.id = p_target_id;
  ELSIF p_target_type = 'photo' THEN
    SELECT jsonb_build_object(
      'authorId', ph.user_id,
      'mediaPaths', jsonb_build_array(ph.storage_path),
      'createdAt', ph.created_at
    ) INTO v_snap
    FROM public.photo_assets ph WHERE ph.id = p_target_id;
  ELSE
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  IF v_snap IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  RETURN v_snap;
END;
$$;

-- can_reporter_view_target for anonymous: member + not blocked + active (or still exists for report)
CREATE OR REPLACE FUNCTION public.can_reporter_view_target(
  p_target_type TEXT,
  p_target_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_owner UUID;
  v_circle UUID;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;

  IF p_target_type = 'profile' THEN
    RETURN EXISTS (SELECT 1 FROM public.app_profiles WHERE id = p_target_id)
      AND NOT public.has_block_relation(v_uid, p_target_id);
  ELSIF p_target_type = 'diary_entry' THEN
    SELECT user_id INTO v_owner FROM public.diary_entries WHERE id = p_target_id;
    IF v_owner IS NULL THEN RETURN false; END IF;
    IF v_owner = v_uid THEN RETURN true; END IF;
    IF public.has_block_relation(v_uid, v_owner) THEN RETURN false; END IF;
    RETURN public.shares_open_circle(v_owner);
  ELSIF p_target_type = 'guestbook_entry' THEN
    SELECT owner_user_id INTO v_owner FROM public.guestbook_entries WHERE id = p_target_id;
    IF v_owner IS NULL THEN RETURN false; END IF;
    RETURN v_owner = v_uid OR public.shares_open_circle(v_owner);
  ELSIF p_target_type = 'circle_post' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.circle_posts p
      WHERE p.id = p_target_id AND public.is_circle_member(p.circle_id)
    );
  ELSIF p_target_type = 'message' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.direct_messages m
      WHERE m.id = p_target_id
        AND (m.sender_id = v_uid OR m.recipient_id = v_uid)
    );
  ELSIF p_target_type = 'anonymous_post' THEN
    SELECT author_user_id, circle_id INTO v_owner, v_circle
    FROM public.anonymous_posts WHERE id = p_target_id;
    IF v_circle IS NULL THEN RETURN false; END IF;
    IF NOT public.is_circle_member(v_circle) THEN RETURN false; END IF;
    IF public.has_block_relation(v_uid, v_owner) THEN RETURN false; END IF;
    RETURN true;
  ELSIF p_target_type = 'photo' THEN
    SELECT user_id INTO v_owner FROM public.photo_assets WHERE id = p_target_id;
    IF v_owner IS NULL THEN RETURN false; END IF;
    IF v_owner = v_uid THEN RETURN true; END IF;
    IF public.has_block_relation(v_uid, v_owner) THEN RETURN false; END IF;
    RETURN public.shares_open_circle(v_owner);
  END IF;

  RETURN false;
END;
$$;

-- admin_hide_content: set removed for anonymous_post
CREATE OR REPLACE FUNCTION public.admin_hide_content(
  p_target_type TEXT,
  p_target_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_moderator() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  IF p_target_type = 'guestbook_entry' THEN
    UPDATE public.guestbook_entries SET hidden = true WHERE id = p_target_id;
  ELSIF p_target_type = 'anonymous_post' THEN
    UPDATE public.anonymous_posts
    SET status = 'removed', hidden = true, updated_at = now(), deleted_at = now()
    WHERE id = p_target_id;
  ELSIF p_target_type = 'circle_post' THEN
    UPDATE public.circle_posts
    SET status = 'hidden', updated_at = now()
    WHERE id = p_target_id;
  END IF;

  PERFORM public.write_admin_audit(
    'hide_content', p_target_type, p_target_id, p_reason, NULL
  );
END;
$$;
