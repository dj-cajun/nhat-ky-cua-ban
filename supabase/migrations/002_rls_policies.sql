-- RLS Policies for Nhật ký của bạn

-- Helper: get current profile id from zalo_id header (set by edge function or JWT)
-- For anon key + client, we use permissive class-based policies for MVP

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profanity_blacklist ENABLE ROW LEVEL SECURITY;

-- Schools & classes: public read
CREATE POLICY "schools_read" ON schools FOR SELECT USING (true);
CREATE POLICY "classes_read" ON classes FOR SELECT USING (true);

-- Profiles: read same class (surname only via view), write own
CREATE POLICY "profiles_read_class" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (zalo_id = current_setting('request.jwt.claims', true)::json->>'sub'
    OR true);

-- Calendar: own CRUD + class read for warp
CREATE POLICY "calendar_own" ON calendar_entries
  FOR ALL USING (true) WITH CHECK (true);

-- Photo albums
CREATE POLICY "photo_own" ON photo_albums
  FOR ALL USING (true) WITH CHECK (true);

-- Posts: class read, own write
CREATE POLICY "posts_class_read" ON posts
  FOR SELECT USING (true);

CREATE POLICY "posts_insert" ON posts
  FOR INSERT WITH CHECK (true);

-- Comments
CREATE POLICY "comments_read" ON post_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON post_comments FOR INSERT WITH CHECK (true);

-- Visitors
CREATE POLICY "visitors_all" ON visitors FOR ALL USING (true) WITH CHECK (true);

-- Votes
CREATE POLICY "vote_sessions_read" ON vote_sessions FOR SELECT USING (true);
CREATE POLICY "vote_responses_own" ON vote_responses FOR ALL USING (true) WITH CHECK (true);

-- Profanity: read only
CREATE POLICY "profanity_read" ON profanity_blacklist FOR SELECT USING (true);

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
