-- 9단계: 실명·가명 쪽지 (편지형, 채팅 아님)
-- 016 이하 수정 금지. app_profiles · circle_aliases 재사용.

-- ---------------------------------------------------------------------------
-- 1) private_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  sender_mode TEXT NOT NULL CHECK (sender_mode IN ('named', 'alias')),
  alias_id UUID REFERENCES public.circle_aliases(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  reply_to_message_id UUID REFERENCES public.private_messages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'sender_deleted', 'recipient_deleted', 'removed')),
  client_request_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (sender_id <> recipient_id),
  CHECK (
    (sender_mode = 'named' AND alias_id IS NULL)
    OR (sender_mode = 'alias' AND alias_id IS NOT NULL)
  ),
  UNIQUE (sender_id, client_request_id)
);

CREATE INDEX IF NOT EXISTS private_messages_recipient_idx
  ON public.private_messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS private_messages_sender_idx
  ON public.private_messages (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS private_messages_circle_idx
  ON public.private_messages (circle_id, created_at DESC);

ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS private_messages_deny ON public.private_messages;
CREATE POLICY private_messages_deny ON public.private_messages
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.private_messages FROM anon, authenticated;

-- Harden legacy direct_messages (no client DML/select for new path)
DROP POLICY IF EXISTS direct_messages_participants ON public.direct_messages;
DROP POLICY IF EXISTS direct_messages_insert ON public.direct_messages;
CREATE POLICY direct_messages_deny ON public.direct_messages
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.direct_messages FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) per-user state (opened / hidden) — opened_at never returned to sender
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.private_message_user_states (
  message_id UUID NOT NULL REFERENCES public.private_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  PRIMARY KEY (message_id, user_id)
);

ALTER TABLE public.private_message_user_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS private_message_user_states_deny ON public.private_message_user_states;
CREATE POLICY private_message_user_states_deny ON public.private_message_user_states
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.private_message_user_states FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) message_preferences (account-wide)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  named_messages_enabled BOOLEAN NOT NULL DEFAULT true,
  alias_messages_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.message_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS message_preferences_deny ON public.message_preferences;
CREATE POLICY message_preferences_deny ON public.message_preferences
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.message_preferences FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
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
  SELECT EXISTS (
    SELECT 1
    FROM public.circle_members cm
    WHERE cm.circle_id = p_circle_id
      AND cm.user_id = p_user_id
      AND cm.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_circle_member(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_circle_member(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_private_message_body(p_body TEXT)
RETURNS VOID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_trim TEXT := btrim(p_body);
BEGIN
  IF char_length(v_trim) < 1 OR char_length(v_trim) > 300 THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  IF v_trim ~* 'https?://' OR v_trim ~* 'www\.' THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  IF v_trim ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}' THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  IF length(regexp_replace(v_trim, '\D', '', 'g')) >= 7 THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  IF v_trim ~ '(.)\1{9,}' THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  IF v_trim ~ '@\w{2,}' THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_message_preferences(p_user_id UUID)
RETURNS public.message_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_row public.message_preferences%ROWTYPE;
BEGIN
  INSERT INTO public.message_preferences (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO v_row FROM public.message_preferences WHERE user_id = p_user_id;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.private_message_reply_depth(p_message_id UUID)
RETURNS INT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID := p_message_id;
  v_depth INT := 0;
  v_parent UUID;
BEGIN
  WHILE v_id IS NOT NULL AND v_depth < 10 LOOP
    SELECT reply_to_message_id INTO v_parent
    FROM public.private_messages WHERE id = v_id;
    IF v_parent IS NULL THEN EXIT; END IF;
    v_depth := v_depth + 1;
    v_id := v_parent;
  END LOOP;
  RETURN v_depth;
END;
$$;

-- ---------------------------------------------------------------------------
-- Preferences RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_message_preferences()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.message_preferences%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  PERFORM public.assert_not_suspended();
  v_row := public.ensure_message_preferences(v_uid);
  RETURN jsonb_build_object(
    'namedEnabled', v_row.named_messages_enabled,
    'aliasEnabled', v_row.alias_messages_enabled,
    'updatedAt', v_row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_my_message_preferences(
  p_named_enabled BOOLEAN,
  p_alias_enabled BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  PERFORM public.assert_not_suspended();
  PERFORM public.ensure_message_preferences(v_uid);
  UPDATE public.message_preferences
  SET named_messages_enabled = COALESCE(p_named_enabled, named_messages_enabled),
      alias_messages_enabled = COALESCE(p_alias_enabled, alias_messages_enabled),
      updated_at = now()
  WHERE user_id = v_uid;
  RETURN public.get_my_message_preferences();
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_message_preferences() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_my_message_preferences(BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_message_preferences() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_message_preferences(BOOLEAN, BOOLEAN) TO authenticated;

-- Shared circles for compose picker
CREATE OR REPLACE FUNCTION public.list_shared_circles_with(p_other_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_other_user_id IS NULL OR p_other_user_id = v_uid THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  IF public.has_block_relation(v_uid, p_other_user_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) ORDER BY c.name)
    FROM public.circles c
    WHERE c.status = 'open'
      AND public.is_active_circle_member(c.id, v_uid)
      AND public.is_active_circle_member(c.id, p_other_user_id)
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.list_shared_circles_with(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_shared_circles_with(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Internal send helper
-- ---------------------------------------------------------------------------
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

  IF NOT public.is_active_circle_member(p_circle_id, v_uid) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  IF NOT public.is_active_circle_member(p_circle_id, p_recipient_id) THEN
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
  RETURN public._send_private_message(
    target_circle_id, recipient_id, body, 'alias',
    reply_to_message_id, client_request_id
  );
END;
$$;

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
  -- Counterpart without exposing id to client
  v_recipient := CASE WHEN v_uid = v_src.sender_id THEN v_src.recipient_id ELSE v_src.sender_id END;
  -- Alias replies default allowed; named replies always allowed by mode choice
  IF sender_mode = 'named' THEN
    -- Initial product: prefer named reply clarity; still allow both modes
    NULL;
  END IF;
  RETURN public._send_private_message(
    v_src.circle_id, v_recipient, body, sender_mode,
    source_message_id, client_request_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.send_named_message(UUID, UUID, TEXT, UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.send_alias_message(UUID, UUID, TEXT, UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reply_to_private_message(UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_named_message(UUID, UUID, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_alias_message(UUID, UUID, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reply_to_private_message(UUID, TEXT, TEXT, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- List / open / hide
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_received_messages(
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20
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

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      m.id,
      m.sender_mode AS "senderMode",
      CASE
        WHEN m.sender_mode = 'alias' THEN COALESCE(ca.alias_name, 'Alias')
        ELSE COALESCE(p.display_name, 'Someone')
      END AS "senderDisplay",
      m.body,
      jsonb_build_object('id', c.id, 'name', c.name) AS circle,
      (us.opened_at IS NOT NULL) AS "isOpened",
      m.created_at AS "createdAt",
      m.reply_to_message_id AS "replyToMessageId"
    FROM public.private_messages m
    JOIN public.circles c ON c.id = m.circle_id
    LEFT JOIN public.circle_aliases ca ON ca.id = m.alias_id
    LEFT JOIN public.app_profiles p ON p.id = m.sender_id AND m.sender_mode = 'named'
    LEFT JOIN public.private_message_user_states us
      ON us.message_id = m.id AND us.user_id = v_uid
    WHERE m.recipient_id = v_uid
      AND m.status IN ('active', 'sender_deleted')
      AND NOT public.has_block_relation(v_uid, m.sender_id)
      AND (us.hidden_at IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM public.hidden_content hc
        WHERE hc.user_id = v_uid
          AND hc.target_type = 'message'
          AND hc.target_id = m.id
      )
      AND (
        p_cursor_created_at IS NULL OR p_cursor_id IS NULL
        OR (m.created_at, m.id) < (p_cursor_created_at, p_cursor_id)
      )
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT v_lim
  ) t;

  v_last := v_items -> (jsonb_array_length(v_items) - 1);
  RETURN jsonb_build_object(
    'items', v_items,
    'nextCursor', CASE
      WHEN jsonb_array_length(v_items) = v_lim THEN jsonb_build_object(
        'createdAt', v_last ->> 'createdAt',
        'id', v_last ->> 'id'
      )
      ELSE NULL
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sent_messages(
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 20
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

  SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO v_items
  FROM (
    SELECT
      m.id,
      m.sender_mode AS "senderMode",
      COALESCE(p.display_name, 'Someone') AS "recipientDisplay",
      m.body,
      jsonb_build_object('id', c.id, 'name', c.name) AS circle,
      m.created_at AS "createdAt",
      m.reply_to_message_id AS "replyToMessageId"
      -- intentionally no opened / hidden / report flags
    FROM public.private_messages m
    JOIN public.circles c ON c.id = m.circle_id
    JOIN public.app_profiles p ON p.id = m.recipient_id
    LEFT JOIN public.private_message_user_states us
      ON us.message_id = m.id AND us.user_id = v_uid
    WHERE m.sender_id = v_uid
      AND m.status IN ('active', 'recipient_deleted')
      AND (us.hidden_at IS NULL)
      AND (
        p_cursor_created_at IS NULL OR p_cursor_id IS NULL
        OR (m.created_at, m.id) < (p_cursor_created_at, p_cursor_id)
      )
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT v_lim
  ) t;

  v_last := v_items -> (jsonb_array_length(v_items) - 1);
  RETURN jsonb_build_object(
    'items', v_items,
    'nextCursor', CASE
      WHEN jsonb_array_length(v_items) = v_lim THEN jsonb_build_object(
        'createdAt', v_last ->> 'createdAt',
        'id', v_last ->> 'id'
      )
      ELSE NULL
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.open_private_message(p_message_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_msg public.private_messages%ROWTYPE;
  v_display TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO v_msg FROM public.private_messages WHERE id = p_message_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_msg.recipient_id <> v_uid THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_msg.status = 'removed' THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF public.has_block_relation(v_uid, v_msg.sender_id) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  INSERT INTO public.private_message_user_states (message_id, user_id, opened_at)
  VALUES (p_message_id, v_uid, now())
  ON CONFLICT (message_id, user_id) DO UPDATE
    SET opened_at = COALESCE(public.private_message_user_states.opened_at, excluded.opened_at);

  IF v_msg.sender_mode = 'alias' THEN
    SELECT alias_name INTO v_display FROM public.circle_aliases WHERE id = v_msg.alias_id;
  ELSE
    SELECT display_name INTO v_display FROM public.app_profiles WHERE id = v_msg.sender_id;
  END IF;

  RETURN jsonb_build_object(
    'id', v_msg.id,
    'senderMode', v_msg.sender_mode,
    'senderDisplay', COALESCE(v_display, 'Someone'),
    'body', v_msg.body,
    'circle', (
      SELECT jsonb_build_object('id', c.id, 'name', c.name)
      FROM public.circles c WHERE c.id = v_msg.circle_id
    ),
    'isOpened', true,
    'createdAt', v_msg.created_at,
    'replyToMessageId', v_msg.reply_to_message_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.hide_private_message(p_message_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_msg public.private_messages%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO v_msg FROM public.private_messages WHERE id = p_message_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_uid <> v_msg.sender_id AND v_uid <> v_msg.recipient_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  INSERT INTO public.private_message_user_states (message_id, user_id, hidden_at)
  VALUES (p_message_id, v_uid, now())
  ON CONFLICT (message_id, user_id) DO UPDATE
    SET hidden_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.block_private_message_sender(p_message_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_msg public.private_messages%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO v_msg FROM public.private_messages WHERE id = p_message_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_msg.recipient_id <> v_uid THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_msg.sender_id = v_uid THEN RAISE EXCEPTION 'VALIDATION'; END IF;
  PERFORM public.block_user(v_msg.sender_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_private_message_sender(
  p_message_id UUID,
  p_moderation_case_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_msg public.private_messages%ROWTYPE;
  v_report public.reports%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.is_app_moderator() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF btrim(COALESCE(p_reason, '')) = '' OR char_length(btrim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  SELECT * INTO v_msg FROM public.private_messages WHERE id = p_message_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;

  SELECT * INTO v_report FROM public.reports WHERE id = p_moderation_case_id;
  IF NOT FOUND
     OR v_report.target_type <> 'message'
     OR v_report.target_id <> p_message_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM public.write_admin_audit(
    'resolve_private_message_sender',
    'message',
    p_message_id,
    btrim(p_reason),
    jsonb_build_object(
      'moderationCaseId', p_moderation_case_id,
      'senderId', v_msg.sender_id
    )
  );

  RETURN jsonb_build_object(
    'messageId', v_msg.id,
    'senderId', v_msg.sender_id,
    'recipientId', v_msg.recipient_id,
    'circleId', v_msg.circle_id,
    'senderMode', v_msg.sender_mode
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_received_messages(TIMESTAMPTZ, UUID, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_sent_messages(TIMESTAMPTZ, UUID, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.open_private_message(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.hide_private_message(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.block_private_message_sender(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_private_message_sender(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_received_messages(TIMESTAMPTZ, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sent_messages(TIMESTAMPTZ, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_private_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hide_private_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_private_message_sender(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_private_message_sender(UUID, UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Report snapshot / can_view / admin_hide — prefer private_messages
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
      'messageId', m.id,
      'circleId', m.circle_id,
      'senderId', m.sender_id,
      'recipientId', m.recipient_id,
      'senderMode', m.sender_mode,
      'aliasName', ca.alias_name,
      'body', m.body,
      'createdAt', m.created_at
    ) INTO v_snap
    FROM public.private_messages m
    LEFT JOIN public.circle_aliases ca ON ca.id = m.alias_id
    WHERE m.id = p_target_id;
    IF v_snap IS NULL THEN
      SELECT jsonb_build_object(
        'messageId', m.id,
        'circleId', m.circle_id,
        'senderId', m.sender_id,
        'recipientId', m.recipient_id,
        'senderMode', m.sender_mode,
        'body', m.body,
        'createdAt', m.created_at
      ) INTO v_snap
      FROM public.direct_messages m WHERE m.id = p_target_id;
    END IF;
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
    IF public.has_block_relation(v_uid, v_owner) THEN RETURN false; END IF;
    RETURN public.shares_open_circle(v_owner);
  ELSIF p_target_type = 'guestbook_entry' THEN
    SELECT author_user_id INTO v_owner FROM public.guestbook_entries WHERE id = p_target_id;
    IF v_owner IS NULL THEN RETURN false; END IF;
    RETURN v_owner = v_uid OR public.shares_open_circle(v_owner);
  ELSIF p_target_type = 'circle_post' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.circle_posts p
      WHERE p.id = p_target_id AND public.is_circle_member(p.circle_id)
    );
  ELSIF p_target_type = 'message' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.private_messages m
      WHERE m.id = p_target_id
        AND (m.sender_id = v_uid OR m.recipient_id = v_uid)
    ) OR EXISTS (
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
  ELSIF p_target_type = 'message' THEN
    UPDATE public.private_messages
    SET status = 'removed'
    WHERE id = p_target_id;
  ELSE
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  PERFORM public.write_admin_audit(
    'admin_hide_content',
    p_target_type,
    p_target_id,
    COALESCE(p_reason, ''),
    NULL
  );
END;
$$;
