-- 「너의 다이어리」 v1 RLS (§19)

ALTER TABLE app_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_creation_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entry_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE guestbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE alias_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE anonymous_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks_v1 ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_circle_member(p_circle_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM circle_members
    WHERE circle_id = p_circle_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.shares_open_circle(p_other UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM circle_members a
    JOIN circle_members b ON a.circle_id = b.circle_id
    JOIN circles c ON c.id = a.circle_id AND c.status = 'open'
    WHERE a.user_id = auth.uid() AND b.user_id = p_other
  );
$$;

-- Profiles
CREATE POLICY app_profiles_select_self_or_shared ON app_profiles
  FOR SELECT USING (
    id = auth.uid() OR public.shares_open_circle(id)
  );
CREATE POLICY app_profiles_insert_self ON app_profiles
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY app_profiles_update_self ON app_profiles
  FOR UPDATE USING (id = auth.uid());

-- Circles: members only; drafts via invites
CREATE POLICY circles_select_member ON circles
  FOR SELECT USING (
    public.is_circle_member(id)
    OR created_by = auth.uid()
  );
CREATE POLICY circles_insert_creator ON circles
  FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY circles_update_admin ON circles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM circle_members
      WHERE circle_id = circles.id
        AND user_id = auth.uid()
        AND role IN ('admin', 'pioneer')
    )
  );

CREATE POLICY circle_members_select ON circle_members
  FOR SELECT USING (public.is_circle_member(circle_id));
CREATE POLICY circle_members_insert ON circle_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR public.is_circle_member(circle_id)
  );

CREATE POLICY circle_drafts_select ON circle_drafts
  FOR SELECT USING (
    inviter_id = auth.uid() OR auth.uid() = ANY (invitee_ids)
  );
CREATE POLICY circle_drafts_insert ON circle_drafts
  FOR INSERT WITH CHECK (inviter_id = auth.uid());

CREATE POLICY creation_invites_select ON circle_creation_invites
  FOR SELECT USING (inviter_id = auth.uid() OR invitee_id = auth.uid());
CREATE POLICY creation_invites_insert ON circle_creation_invites
  FOR INSERT WITH CHECK (inviter_id = auth.uid());
CREATE POLICY creation_invites_update_invitee ON circle_creation_invites
  FOR UPDATE USING (invitee_id = auth.uid());

CREATE POLICY join_requests_select ON circle_join_requests
  FOR SELECT USING (
    applicant_id = auth.uid() OR public.is_circle_member(circle_id)
  );
CREATE POLICY join_requests_insert ON circle_join_requests
  FOR INSERT WITH CHECK (applicant_id = auth.uid());

CREATE POLICY recommendations_select ON circle_recommendations
  FOR SELECT USING (recommender_id = auth.uid());
CREATE POLICY recommendations_update ON circle_recommendations
  FOR UPDATE USING (recommender_id = auth.uid());

CREATE POLICY presence_select ON circle_presence
  FOR SELECT USING (public.is_circle_member(circle_id));
CREATE POLICY presence_upsert ON circle_presence
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY circle_posts_select ON circle_posts
  FOR SELECT USING (public.is_circle_member(circle_id));
CREATE POLICY circle_posts_insert ON circle_posts
  FOR INSERT WITH CHECK (public.is_circle_member(circle_id) AND created_by = auth.uid());

CREATE POLICY poll_options_select ON circle_poll_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM circle_posts p
      WHERE p.id = post_id AND public.is_circle_member(p.circle_id)
    )
  );

CREATE POLICY circle_responses_select ON circle_responses
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM circle_posts p
      WHERE p.id = post_id AND public.is_circle_member(p.circle_id)
    )
  );
CREATE POLICY circle_responses_insert ON circle_responses
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Diary: owner always; others only via visibility + shared circle (enforced in app + views)
CREATE POLICY diary_entries_owner ON diary_entries
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY diary_entries_shared_select ON diary_entries
  FOR SELECT USING (
    visibility_mode = 'all_circles' AND public.shares_open_circle(user_id)
    OR (
      visibility_mode = 'selected_circles'
      AND EXISTS (
        SELECT 1 FROM diary_entry_visibility v
        JOIN circle_members m ON m.circle_id = v.circle_id AND m.user_id = auth.uid()
        WHERE v.entry_id = diary_entries.id
      )
    )
  );

CREATE POLICY diary_visibility_owner ON diary_entry_visibility
  FOR ALL USING (
    EXISTS (SELECT 1 FROM diary_entries e WHERE e.id = entry_id AND e.user_id = auth.uid())
  );

CREATE POLICY photo_assets_owner ON photo_assets
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY photo_assets_shared ON photo_assets
  FOR SELECT USING (public.shares_open_circle(user_id));

CREATE POLICY guestbook_select ON guestbook_entries
  FOR SELECT USING (
    owner_user_id = auth.uid() OR author_user_id = auth.uid()
    OR public.shares_open_circle(owner_user_id)
  );
CREATE POLICY guestbook_insert ON guestbook_entries
  FOR INSERT WITH CHECK (author_user_id = auth.uid());

-- Alias profiles: members see alias names only (no user_id leakage via view in app)
-- RLS: members can read alias_name rows but clients must not expose user_id mapping in UI
CREATE POLICY alias_profiles_member_select ON alias_profiles
  FOR SELECT USING (public.is_circle_member(circle_id));
CREATE POLICY alias_profiles_self ON alias_profiles
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Anonymous posts: hide author_user_id from clients via column grants later;
-- SELECT allowed for members (app must not render author_user_id)
CREATE POLICY anonymous_posts_select ON anonymous_posts
  FOR SELECT USING (public.is_circle_member(circle_id) AND hidden = false);
CREATE POLICY anonymous_posts_insert ON anonymous_posts
  FOR INSERT WITH CHECK (
    author_user_id = auth.uid() AND public.is_circle_member(circle_id)
  );

CREATE POLICY direct_messages_participants ON direct_messages
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY direct_messages_insert ON direct_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY music_modules_owner ON music_modules
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY music_modules_shared ON music_modules
  FOR SELECT USING (public.shares_open_circle(user_id));

CREATE POLICY content_reports_insert ON content_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());
CREATE POLICY content_reports_own ON content_reports
  FOR SELECT USING (reporter_id = auth.uid());

CREATE POLICY user_blocks_v1_own ON user_blocks_v1
  FOR ALL USING (blocker_id = auth.uid()) WITH CHECK (blocker_id = auth.uid());

-- Revoke author identity from anon/authenticated for anonymous_posts
REVOKE SELECT (author_user_id) ON anonymous_posts FROM authenticated, anon;
GRANT SELECT (
  id, circle_id, alias_profile_id, body, hidden, created_at
) ON anonymous_posts TO authenticated;
