-- Nhật ký của bạn — Initial Schema
-- Run via Supabase CLI: supabase db push

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schools & Classes
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Ho Chi Minh',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (school_id, name)
);

-- Profiles (Zalo user mapping)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zalo_id TEXT UNIQUE NOT NULL,
  real_name TEXT NOT NULL,
  surname TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id),
  avatar_url TEXT,
  status_message TEXT DEFAULT '',
  hint_data TEXT NOT NULL, -- encrypted JSON
  dotori_balance INT DEFAULT 5,
  visit_count_today INT DEFAULT 0,
  visit_count_total INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Calendar (5-char diary)
CREATE TABLE calendar_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  content VARCHAR(5) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

-- Photo album
CREATE TABLE photo_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL DEFAULT '',
  caption VARCHAR(10) DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Posts (anonymous feed)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  board_type TEXT NOT NULL CHECK (board_type IN ('diary', 'school', 'vote', 'guestbook')),
  content TEXT NOT NULL,
  has_photo BOOLEAN DEFAULT false,
  has_video BOOLEAN DEFAULT false,
  has_link BOOLEAN DEFAULT false,
  media_urls JSONB,
  target_user_id UUID REFERENCES profiles(id), -- guestbook target
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_posts_class_board ON posts(class_id, board_type, created_at DESC);

-- Comments
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Visitors
CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_visitors_host ON visitors(host_id, visited_at DESC);

-- Vote sessions
CREATE TABLE vote_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id),
  session_date DATE NOT NULL,
  question_index INT NOT NULL CHECK (question_index BETWEEN 1 AND 12),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  UNIQUE (class_id, session_date, question_index)
);

-- Vote responses
CREATE TABLE vote_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES vote_sessions(id),
  voter_id UUID NOT NULL REFERENCES profiles(id),
  selected_user_id UUID NOT NULL REFERENCES profiles(id),
  hint_shield TEXT NOT NULL CHECK (hint_shield IN ('surname', 'height', 'gender', 'commute')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, voter_id)
);

-- Profanity blacklist
CREATE TABLE profanity_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('vi', 'ko')),
  UNIQUE (word, language)
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_responses ENABLE ROW LEVEL SECURITY;

-- Seed profanity (sample)
INSERT INTO profanity_blacklist (word, language) VALUES
  ('ditme', 'vi'), ('lon', 'vi'), ('dmm', 'vi'),
  ('시발', 'ko'), ('병신', 'ko'), ('지랄', 'ko')
ON CONFLICT DO NOTHING;
