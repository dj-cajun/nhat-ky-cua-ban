-- 10단계: Spotify 오늘의 음악 카드
-- 017 이하 수정 금지. 자동재생·앱 내 스트리밍 없음.

-- ---------------------------------------------------------------------------
-- 1) diary_music_modules (1 track per diary entry)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.diary_music_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_entry_id UUID NOT NULL REFERENCES public.diary_entries(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'spotify' CHECK (provider = 'spotify'),
  external_track_id TEXT NOT NULL,
  spotify_uri TEXT NOT NULL,
  external_url TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist_names TEXT[] NOT NULL,
  album_name TEXT,
  artwork_url TEXT,
  duration_ms INTEGER,
  explicit BOOLEAN NOT NULL DEFAULT false,
  market TEXT,
  metadata_fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (diary_entry_id)
);

CREATE INDEX IF NOT EXISTS diary_music_modules_track_idx
  ON public.diary_music_modules (external_track_id);

ALTER TABLE public.diary_music_modules ENABLE ROW LEVEL SECURITY;

-- Prefer RPC; deny direct client DML. SELECT only via can_view path helper.
DROP POLICY IF EXISTS diary_music_modules_deny_write ON public.diary_music_modules;
CREATE POLICY diary_music_modules_deny_write ON public.diary_music_modules
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON public.diary_music_modules FROM anon, authenticated;

-- Harden legacy music_modules writes (keep for old rows; no new client DML)
DROP POLICY IF EXISTS music_modules_owner ON public.music_modules;
DROP POLICY IF EXISTS music_modules_shared ON public.music_modules;
CREATE POLICY music_modules_deny ON public.music_modules
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON public.music_modules FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.parse_spotify_track_id(p_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v TEXT := btrim(COALESCE(p_input, ''));
  v_id TEXT;
BEGIN
  IF v = '' THEN RETURN NULL; END IF;
  IF v ~* 'spotify:track:([A-Za-z0-9]+)' THEN
    v_id := substring(v from '(?i)spotify:track:([A-Za-z0-9]+)');
  ELSIF v ~* 'open\.spotify\.com/track/([A-Za-z0-9]+)' THEN
    v_id := substring(v from '(?i)open\.spotify\.com/track/([A-Za-z0-9]+)');
  ELSIF v ~ '^[A-Za-z0-9]{10,30}$' THEN
    v_id := v;
  ELSE
    RETURN NULL;
  END IF;
  IF v ~* '/(album|artist|playlist|episode|show)/' THEN
    RETURN NULL;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_allowed_spotify_artwork_url(p_url TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT p_url IS NULL
    OR p_url ~* '^https://i\.scdn\.co/'
    OR p_url ~* '^https://mosaic\.scdn\.co/'
    OR p_url ~* '^https://image-cdn-.*\.spotifycdn\.com/';
$$;

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
  -- selected_circles
  RETURN EXISTS (
    SELECT 1
    FROM public.diary_entry_visibility v
    JOIN public.circle_members cm ON cm.circle_id = v.circle_id
    WHERE v.entry_id = p_entry_id
      AND cm.user_id = v_uid
      AND cm.status = 'active'
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Apply verified metadata (called by Edge after Spotify fetch)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_diary_spotify_track(
  p_diary_entry_id UUID,
  p_external_track_id TEXT,
  p_spotify_uri TEXT,
  p_external_url TEXT,
  p_track_name TEXT,
  p_artist_names TEXT[],
  p_album_name TEXT DEFAULT NULL,
  p_artwork_url TEXT DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL,
  p_explicit BOOLEAN DEFAULT false,
  p_market TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_entry public.diary_entries%ROWTYPE;
  v_track_id TEXT;
  v_row public.diary_music_modules%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  PERFORM public.assert_not_suspended();

  SELECT * INTO v_entry
  FROM public.diary_entries
  WHERE id = p_diary_entry_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_entry.user_id <> v_uid THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;

  v_track_id := public.parse_spotify_track_id(p_external_track_id);
  IF v_track_id IS NULL OR v_track_id <> p_external_track_id THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;
  IF p_spotify_uri IS NULL OR p_external_url IS NULL THEN RAISE EXCEPTION 'VALIDATION'; END IF;
  IF btrim(COALESCE(p_track_name, '')) = '' THEN RAISE EXCEPTION 'VALIDATION'; END IF;
  IF p_artist_names IS NULL OR cardinality(p_artist_names) < 1 THEN RAISE EXCEPTION 'VALIDATION'; END IF;
  IF p_artwork_url IS NOT NULL AND NOT public.is_allowed_spotify_artwork_url(p_artwork_url) THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  INSERT INTO public.diary_music_modules (
    diary_entry_id, provider, external_track_id, spotify_uri, external_url,
    track_name, artist_names, album_name, artwork_url, duration_ms, explicit,
    market, metadata_fetched_at, updated_at
  ) VALUES (
    p_diary_entry_id, 'spotify', v_track_id, p_spotify_uri, p_external_url,
    btrim(p_track_name), p_artist_names, p_album_name, p_artwork_url, p_duration_ms,
    COALESCE(p_explicit, false), p_market, now(), now()
  )
  ON CONFLICT (diary_entry_id) DO UPDATE SET
    external_track_id = EXCLUDED.external_track_id,
    spotify_uri = EXCLUDED.spotify_uri,
    external_url = EXCLUDED.external_url,
    track_name = EXCLUDED.track_name,
    artist_names = EXCLUDED.artist_names,
    album_name = EXCLUDED.album_name,
    artwork_url = EXCLUDED.artwork_url,
    duration_ms = EXCLUDED.duration_ms,
    explicit = EXCLUDED.explicit,
    market = EXCLUDED.market,
    metadata_fetched_at = now(),
    updated_at = now()
  RETURNING * INTO v_row;

  -- Keep legacy pointer if column exists
  BEGIN
    UPDATE public.diary_entries
    SET music_module_id = NULL, updated_at = now()
    WHERE id = p_diary_entry_id;
  EXCEPTION WHEN undefined_column THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'diaryEntryId', v_row.diary_entry_id,
    'externalTrackId', v_row.external_track_id,
    'spotifyUri', v_row.spotify_uri,
    'externalUrl', v_row.external_url,
    'trackName', v_row.track_name,
    'artistNames', to_jsonb(v_row.artist_names),
    'albumName', v_row.album_name,
    'artworkUrl', v_row.artwork_url,
    'durationMs', v_row.duration_ms,
    'explicit', v_row.explicit
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_diary_music(p_diary_entry_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_entry public.diary_entries%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT * INTO v_entry FROM public.diary_entries WHERE id = p_diary_entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_entry.user_id <> v_uid THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  DELETE FROM public.diary_music_modules WHERE diary_entry_id = p_diary_entry_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_diary_music(p_diary_entry_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_row public.diary_music_modules%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT public.can_view_diary_entry(p_diary_entry_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;
  SELECT * INTO v_row FROM public.diary_music_modules WHERE diary_entry_id = p_diary_entry_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'id', v_row.id,
    'diaryEntryId', v_row.diary_entry_id,
    'externalTrackId', v_row.external_track_id,
    'spotifyUri', v_row.spotify_uri,
    'externalUrl', v_row.external_url,
    'trackName', v_row.track_name,
    'artistNames', to_jsonb(v_row.artist_names),
    'albumName', v_row.album_name,
    'artworkUrl', v_row.artwork_url,
    'durationMs', v_row.duration_ms,
    'explicit', v_row.explicit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_diary_spotify_track(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, INTEGER, BOOLEAN, TEXT
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_diary_music(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_diary_music(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_diary_spotify_track(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, INTEGER, BOOLEAN, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_diary_music(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_diary_music(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Enrich diary report snapshot with music (no tokens)
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
  v_music JSONB;
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
    SELECT jsonb_build_object(
      'trackName', m.track_name,
      'artistNames', to_jsonb(m.artist_names),
      'externalTrackId', m.external_track_id
    ) INTO v_music
    FROM public.diary_music_modules m WHERE m.diary_entry_id = p_target_id;
    IF v_music IS NOT NULL THEN
      v_snap := v_snap || jsonb_build_object('music', v_music);
    END IF;
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
