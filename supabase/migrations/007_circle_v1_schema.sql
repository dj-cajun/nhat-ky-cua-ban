-- 「너의 다이어리」 v1 — 서클·미니홈피 스키마 (§18)
-- 기존 학교/개척단 테이블과 병행. auth.users 연동 프로파일은 id = auth.uid()

CREATE TABLE IF NOT EXISTS app_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  auth_provider TEXT NOT NULL DEFAULT 'email',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  terms_accepted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#7C9A8E',
  symbol TEXT NOT NULL DEFAULT '○',
  created_by UUID NOT NULL REFERENCES app_profiles(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_accept', 'open', 'archived')),
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS circle_members (
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'admin', 'pioneer')),
  is_pioneer BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (circle_id, user_id)
);

CREATE TABLE IF NOT EXISTS circle_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  inviter_id UUID NOT NULL REFERENCES app_profiles(id),
  invitee_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS circle_creation_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_draft_id UUID NOT NULL REFERENCES circle_drafts(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES app_profiles(id),
  invitee_id UUID NOT NULL REFERENCES app_profiles(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE (circle_draft_id, invitee_id)
);

CREATE TABLE IF NOT EXISTS circle_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES app_profiles(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS circle_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  join_request_id UUID NOT NULL REFERENCES circle_join_requests(id) ON DELETE CASCADE,
  recommender_id UUID NOT NULL REFERENCES app_profiles(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'recommended', 'unknown', 'later')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (join_request_id, recommender_id)
);

CREATE TABLE IF NOT EXISTS circle_presence (
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT now(),
  active_session_id TEXT NOT NULL,
  PRIMARY KEY (circle_id, user_id)
);

CREATE TABLE IF NOT EXISTS circle_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('notice', 'poll')),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  closes_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES app_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS circle_poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES circle_posts(id) ON DELETE CASCADE,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS circle_responses (
  post_id UUID NOT NULL REFERENCES circle_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  option_id UUID REFERENCES circle_poll_options(id),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  mood TEXT,
  ten_char_text VARCHAR(10),
  short_text TEXT,
  representative_photo_id UUID,
  music_module_id UUID,
  visibility_mode TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility_mode IN ('private', 'selected_circles', 'all_circles')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

CREATE TABLE IF NOT EXISTS diary_entry_visibility (
  entry_id UUID NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, circle_id)
);

CREATE TABLE IF NOT EXISTS photo_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE diary_entries
  DROP CONSTRAINT IF EXISTS diary_entries_representative_photo_id_fkey;
ALTER TABLE diary_entries
  ADD CONSTRAINT diary_entries_representative_photo_id_fkey
  FOREIGN KEY (representative_photo_id) REFERENCES photo_assets(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS guestbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alias_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (circle_id, user_id)
);

CREATE TABLE IF NOT EXISTS anonymous_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES app_profiles(id),
  alias_profile_id UUID NOT NULL REFERENCES alias_profiles(id),
  body TEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES app_profiles(id),
  recipient_id UUID NOT NULL REFERENCES app_profiles(id),
  circle_id UUID NOT NULL REFERENCES circles(id),
  sender_mode TEXT NOT NULL CHECK (sender_mode IN ('real_name', 'alias')),
  alias_profile_id UUID REFERENCES alias_profiles(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS music_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  spotify_url TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE diary_entries
  DROP CONSTRAINT IF EXISTS diary_entries_music_module_id_fkey;
ALTER TABLE diary_entries
  ADD CONSTRAINT diary_entries_music_module_id_fkey
  FOREIGN KEY (music_module_id) REFERENCES music_modules(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES app_profiles(id),
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_blocks_v1 (
  blocker_id UUID NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES app_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_circle_members_user ON circle_members(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_date ON diary_entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_circle_posts_active ON circle_posts(circle_id, closes_at);
CREATE INDEX IF NOT EXISTS idx_anonymous_posts_circle ON anonymous_posts(circle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient ON direct_messages(recipient_id, created_at DESC);
