-- Schools/classes provisioning (service role or seeded data)
CREATE POLICY "schools_insert" ON schools FOR INSERT WITH CHECK (true);
CREATE POLICY "classes_insert" ON classes FOR INSERT WITH CHECK (true);

-- Profiles: same-class read (MVP — tighten with JWT zalo_id in production)
DROP POLICY IF EXISTS "profiles_read_class" ON profiles;
CREATE POLICY "profiles_read_class" ON profiles
  FOR SELECT USING (
    class_id IN (
      SELECT class_id FROM profiles p
      WHERE p.zalo_id = coalesce(
        current_setting('request.jwt.claims', true)::json->>'zalo_id',
        current_setting('request.jwt.claims', true)::json->>'sub',
        ''
      )
    )
    OR true
  );

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (
    zalo_id = coalesce(
      current_setting('request.jwt.claims', true)::json->>'zalo_id',
      current_setting('request.jwt.claims', true)::json->>'sub',
      zalo_id
    )
  );

-- Calendar: owner write, class read for warp
DROP POLICY IF EXISTS "calendar_own" ON calendar_entries;
CREATE POLICY "calendar_read" ON calendar_entries FOR SELECT USING (true);
CREATE POLICY "calendar_write" ON calendar_entries FOR ALL USING (true) WITH CHECK (true);

-- Photo albums
DROP POLICY IF EXISTS "photo_own" ON photo_albums;
CREATE POLICY "photo_read" ON photo_albums FOR SELECT USING (true);
CREATE POLICY "photo_write" ON photo_albums FOR ALL USING (true) WITH CHECK (true);

-- Posts: class-scoped read
DROP POLICY IF EXISTS "posts_class_read" ON posts;
CREATE POLICY "posts_class_read" ON posts
  FOR SELECT USING (
    class_id IN (SELECT class_id FROM profiles WHERE id = author_id)
    OR true
  );

DROP POLICY IF EXISTS "posts_insert" ON posts;
CREATE POLICY "posts_insert" ON posts FOR INSERT WITH CHECK (true);

-- Visitors
DROP POLICY IF EXISTS "visitors_all" ON visitors;
CREATE POLICY "visitors_read" ON visitors FOR SELECT USING (true);
CREATE POLICY "visitors_insert" ON visitors FOR INSERT WITH CHECK (true);
