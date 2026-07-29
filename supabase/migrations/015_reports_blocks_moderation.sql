-- 7단계: 신고·차단·제재 기반
-- 014 이하 수정 금지. app_profiles 기준.

-- ---------------------------------------------------------------------------
-- 1) blocks (canonical) + migrate from user_blocks_v1
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id UUID NOT NULL REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

INSERT INTO public.blocks (blocker_id, blocked_id, created_at)
SELECT ub.blocker_id, ub.blocked_id, ub.created_at
FROM public.user_blocks_v1 ub
ON CONFLICT DO NOTHING;

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS blocks_select_own ON public.blocks;
CREATE POLICY blocks_select_own ON public.blocks
  FOR SELECT TO authenticated
  USING (blocker_id = (SELECT auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.blocks FROM anon, authenticated;
GRANT SELECT ON public.blocks TO authenticated;

CREATE OR REPLACE FUNCTION public.is_blocked_between(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocks blk
    WHERE (blk.blocker_id = a AND blk.blocked_id = b)
       OR (blk.blocker_id = b AND blk.blocked_id = a)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_block_relation(
  first_user_id UUID,
  second_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_blocked_between(first_user_id, second_user_id);
$$;

REVOKE ALL ON FUNCTION public.has_block_relation(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_block_relation(UUID, UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.is_blocked_between(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_blocked_between(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.app_profiles(id),
  target_type TEXT NOT NULL
    CHECK (target_type IN (
      'profile', 'diary_entry', 'photo', 'guestbook_entry',
      'circle_post', 'message', 'anonymous_post'
    )),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL
    CHECK (reason IN (
      'harassment', 'threat', 'hate', 'sexual_content', 'privacy',
      'spam', 'impersonation', 'self_harm', 'other'
    )),
  details TEXT,
  content_snapshot JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS one_report_per_user_target
  ON public.reports (reporter_id, target_type, target_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reports_select_own ON public.reports;
CREATE POLICY reports_select_own ON public.reports
  FOR SELECT TO authenticated
  USING (reporter_id = (SELECT auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.reports FROM anon, authenticated;
GRANT SELECT (
  id, reporter_id, target_type, target_id, reason, details, status,
  created_at, reviewed_at, resolved_at
) ON public.reports TO authenticated;
REVOKE SELECT (content_snapshot) ON public.reports FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) hidden_content
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hidden_content (
  user_id UUID NOT NULL REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);

ALTER TABLE public.hidden_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hidden_content_own ON public.hidden_content;
CREATE POLICY hidden_content_own ON public.hidden_content
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.hidden_content FROM anon, authenticated;
GRANT SELECT ON public.hidden_content TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) user_moderation_status
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_moderation_status (
  user_id UUID PRIMARY KEY REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'restricted', 'suspended')),
  anonymous_posting_disabled_until TIMESTAMPTZ,
  messaging_disabled_until TIMESTAMPTZ,
  content_creation_disabled_until TIMESTAMPTZ,
  reason_code TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_moderation_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_moderation_status_self ON public.user_moderation_status;
CREATE POLICY user_moderation_status_self ON public.user_moderation_status
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.user_moderation_status FROM anon, authenticated;
GRANT SELECT ON public.user_moderation_status TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) admin_audit_logs + moderators
-- ---------------------------------------------------------------------------
ALTER TABLE public.admin_audit_logs
  ADD COLUMN IF NOT EXISTS target_type TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE TABLE IF NOT EXISTS public.app_moderators (
  user_id UUID PRIMARY KEY REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'moderator'
    CHECK (role IN ('moderator', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_moderators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_moderators_deny ON public.app_moderators;
CREATE POLICY app_moderators_deny ON public.app_moderators
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.app_moderators FROM anon, authenticated;

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_audit_logs_deny ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_deny ON public.admin_audit_logs
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.admin_audit_logs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_app_moderator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_moderators m
    WHERE m.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_app_moderator() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.assert_not_suspended()
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT account_status INTO v_status
  FROM public.user_moderation_status
  WHERE user_id = auth.uid();

  IF COALESCE(v_status, 'active') = 'suspended' THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6) block_user / unblock_user / list_my_blocks
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.block_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  PERFORM public.assert_not_suspended();
  IF target_user_id IS NULL OR target_user_id = v_uid THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.app_profiles p WHERE p.id = target_user_id) THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  INSERT INTO public.blocks (blocker_id, blocked_id)
  VALUES (v_uid, target_user_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_blocks_v1 (blocker_id, blocked_id)
  VALUES (v_uid, target_user_id)
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.block_user(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.block_user(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.unblock_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  DELETE FROM public.blocks
  WHERE blocker_id = v_uid AND blocked_id = target_user_id;
  DELETE FROM public.user_blocks_v1
  WHERE blocker_id = v_uid AND blocked_id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.unblock_user(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unblock_user(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_blocks()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(array_agg(blocked_id ORDER BY created_at DESC), '{}')
  FROM public.blocks
  WHERE blocker_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.list_my_blocks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_blocks() TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) Snapshot + view gate + submit_report
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
      'circleId', a.circle_id,
      'body', a.body,
      'createdAt', a.created_at,
      'aliasProfileId', a.alias_profile_id
    ) INTO v_snap
    FROM public.anonymous_posts a WHERE a.id = p_target_id;
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

REVOKE ALL ON FUNCTION public.build_report_snapshot(TEXT, UUID) FROM PUBLIC, anon, authenticated;

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
    RETURN EXISTS (
      SELECT 1 FROM public.anonymous_posts a
      WHERE a.id = p_target_id AND public.is_circle_member(a.circle_id)
    );
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

CREATE OR REPLACE FUNCTION public.submit_report(
  p_target_type TEXT,
  p_target_id UUID,
  p_reason TEXT,
  p_details TEXT DEFAULT NULL,
  p_hide_for_me BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_snap JSONB;
  v_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  PERFORM public.assert_not_suspended();

  IF p_target_type NOT IN (
    'profile', 'diary_entry', 'photo', 'guestbook_entry',
    'circle_post', 'message', 'anonymous_post'
  ) THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  IF p_reason NOT IN (
    'harassment', 'threat', 'hate', 'sexual_content', 'privacy',
    'spam', 'impersonation', 'self_harm', 'other'
  ) THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  IF NOT public.can_reporter_view_target(p_target_type, p_target_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_target_type = 'diary_entry' THEN
    IF EXISTS (
      SELECT 1 FROM public.diary_entries e
      WHERE e.id = p_target_id AND e.user_id = v_uid
    ) THEN
      RAISE EXCEPTION 'VALIDATION';
    END IF;
  END IF;

  v_snap := public.build_report_snapshot(p_target_type, p_target_id);

  INSERT INTO public.reports (
    reporter_id, target_type, target_id, reason, details, content_snapshot, status
  )
  VALUES (
    v_uid, p_target_type, p_target_id, p_reason,
    NULLIF(btrim(COALESCE(p_details, '')), ''),
    v_snap, 'submitted'
  )
  ON CONFLICT (reporter_id, target_type, target_id) DO UPDATE
    SET details = COALESCE(EXCLUDED.details, public.reports.details)
  RETURNING id INTO v_id;

  IF COALESCE(p_hide_for_me, true) THEN
    INSERT INTO public.hidden_content (user_id, target_type, target_id)
    VALUES (v_uid, p_target_type, p_target_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_report(TEXT, UUID, TEXT, TEXT, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_report(TEXT, UUID, TEXT, TEXT, BOOLEAN)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_reports()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'targetType', r.target_type,
    'targetId', r.target_id,
    'reason', r.reason,
    'status', CASE
      WHEN r.status = 'submitted' THEN 'received'
      WHEN r.status = 'reviewing' THEN 'reviewing'
      ELSE 'closed'
    END,
    'createdAt', r.created_at
  ) ORDER BY r.created_at DESC), '[]'::jsonb)
  FROM public.reports r
  WHERE r.reporter_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.list_my_reports() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_reports() TO authenticated;

CREATE OR REPLACE FUNCTION public.hide_content_for_me(
  p_target_type TEXT,
  p_target_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  INSERT INTO public.hidden_content (user_id, target_type, target_id)
  VALUES (auth.uid(), p_target_type, p_target_id)
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.hide_content_for_me(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hide_content_for_me(TEXT, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8) Photo signed URL token — block gate
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_photo_signed_url_token(p_photo_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_photo public.photo_assets%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  PERFORM public.assert_not_suspended();

  SELECT * INTO v_photo FROM public.photo_assets WHERE id = p_photo_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  IF v_photo.user_id <> v_uid THEN
    IF public.has_block_relation(v_uid, v_photo.user_id) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
    IF NOT public.shares_open_circle(v_photo.user_id) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'photoId', v_photo.id,
    'storagePath', v_photo.storage_path,
    'allowed', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_photo_signed_url_token(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_photo_signed_url_token(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 9) Badge states — exclude blocked users for viewer
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
  PERFORM public.assert_not_suspended();

  SELECT * INTO v_post
  FROM public.circle_posts p
  WHERE p.circle_id = target_circle_id
    AND p.status = 'active'
    AND p.closes_at > now()
  ORDER BY p.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('postId', NULL, 'respondedUserIds', '[]'::jsonb);
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
        AND NOT public.has_block_relation(v_uid, r.user_id)
    ), '[]'::jsonb)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 10) RLS: diary / guestbook / photos / messages — block relation
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS diary_entries_select ON public.diary_entries;
DROP POLICY IF EXISTS diary_entries_shared_select ON public.diary_entries;
CREATE POLICY diary_entries_shared_select ON public.diary_entries
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      visibility_mode = 'all_circles'
      AND NOT public.has_block_relation((SELECT auth.uid()), user_id)
      AND public.shares_open_circle(user_id)
    )
  );

DROP POLICY IF EXISTS guestbook_select ON public.guestbook_entries;
CREATE POLICY guestbook_select ON public.guestbook_entries
  FOR SELECT TO authenticated
  USING (
    (
      owner_user_id = (SELECT auth.uid())
      OR author_user_id = (SELECT auth.uid())
      OR public.shares_open_circle(owner_user_id)
    )
    AND NOT public.has_block_relation((SELECT auth.uid()), owner_user_id)
    AND NOT public.has_block_relation((SELECT auth.uid()), author_user_id)
  );

DROP POLICY IF EXISTS guestbook_insert ON public.guestbook_entries;
CREATE POLICY guestbook_insert ON public.guestbook_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = (SELECT auth.uid())
    AND NOT public.has_block_relation((SELECT auth.uid()), owner_user_id)
  );

DROP POLICY IF EXISTS photo_assets_shared ON public.photo_assets;
CREATE POLICY photo_assets_shared ON public.photo_assets
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      NOT public.has_block_relation((SELECT auth.uid()), user_id)
      AND public.shares_open_circle(user_id)
    )
  );

DROP POLICY IF EXISTS direct_messages_insert ON public.direct_messages;
CREATE POLICY direct_messages_insert ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND NOT public.has_block_relation((SELECT auth.uid()), recipient_id)
  );

-- ---------------------------------------------------------------------------
-- 11) Admin moderation RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.write_admin_audit(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_reason TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.admin_audit_logs (admin_id, action, target_type, target_id, reason, metadata)
  VALUES (
    auth.uid(),
    p_action,
    p_target_type,
    p_target_id::text,
    p_reason,
    p_metadata
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_report(p_report_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.reports%ROWTYPE;
BEGIN
  IF NOT public.is_app_moderator() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO v_row FROM public.reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  UPDATE public.reports
  SET status = 'reviewing', reviewed_at = COALESCE(reviewed_at, now())
  WHERE id = p_report_id;

  PERFORM public.write_admin_audit(
    'review_report', 'report', p_report_id, 'opened_for_review',
    jsonb_build_object('viewedSnapshot', true)
  );

  RETURN jsonb_build_object(
    'id', v_row.id,
    'targetType', v_row.target_type,
    'targetId', v_row.target_id,
    'reason', v_row.reason,
    'details', v_row.details,
    'contentSnapshot', v_row.content_snapshot,
    'status', 'reviewing',
    'reporterId', v_row.reporter_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_review_report(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_resolve_report(
  p_report_id UUID,
  p_action TEXT,
  p_note TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_moderator() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  UPDATE public.reports
  SET status = 'resolved', resolved_at = now()
  WHERE id = p_report_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  PERFORM public.write_admin_audit(
    'resolve_report', 'report', p_report_id, COALESCE(p_note, p_action),
    jsonb_build_object('action', p_action)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_report(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_dismiss_report(
  p_report_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_moderator() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  UPDATE public.reports
  SET status = 'dismissed', resolved_at = now()
  WHERE id = p_report_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  PERFORM public.write_admin_audit(
    'dismiss_report', 'report', p_report_id, COALESCE(p_reason, 'dismissed'), NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dismiss_report(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_restrict_user(
  p_user_id UUID,
  p_restriction TEXT,
  p_expires_at TIMESTAMPTZ,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_moderator() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  INSERT INTO public.user_moderation_status AS s (
    user_id, account_status, content_creation_disabled_until, reason_code, updated_at
  )
  VALUES (p_user_id, 'restricted', p_expires_at, p_restriction, now())
  ON CONFLICT (user_id) DO UPDATE
    SET account_status = 'restricted',
        content_creation_disabled_until = EXCLUDED.content_creation_disabled_until,
        reason_code = EXCLUDED.reason_code,
        updated_at = now();

  PERFORM public.write_admin_audit(
    'restrict_user', 'user', p_user_id, p_reason,
    jsonb_build_object('restriction', p_restriction, 'expiresAt', p_expires_at)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_restrict_user(UUID, TEXT, TIMESTAMPTZ, TEXT)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_suspend_user(
  p_user_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_moderator() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  INSERT INTO public.user_moderation_status (user_id, account_status, reason_code, updated_at)
  VALUES (p_user_id, 'suspended', 'suspended', now())
  ON CONFLICT (user_id) DO UPDATE
    SET account_status = 'suspended',
        reason_code = 'suspended',
        updated_at = now();

  PERFORM public.write_admin_audit(
    'suspend_user', 'user', p_user_id, p_reason, NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_suspend_user(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

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
    UPDATE public.anonymous_posts SET hidden = true WHERE id = p_target_id;
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

REVOKE ALL ON FUNCTION public.admin_hide_content(TEXT, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.user_blocks_v1 FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.content_reports FROM anon, authenticated;

-- Authenticated may CALL admin RPCs; body still requires is_app_moderator().
GRANT EXECUTE ON FUNCTION public.admin_review_report(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dismiss_report(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restrict_user(UUID, TEXT, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_suspend_user(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_hide_content(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_moderator() TO authenticated;
