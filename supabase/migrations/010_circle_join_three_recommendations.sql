-- 4단계: 3인 추천 가입 — 스키마 정렬 · RPC · RLS
-- 007 / 008 은 수정하지 않음. 009 이후 추가 마이그레이션만 사용.

-- ---------------------------------------------------------------------------
-- 1) circle_join_requests — expires / approved / updated + status 정렬
-- ---------------------------------------------------------------------------
ALTER TABLE public.circle_join_requests
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.circle_join_requests
SET expires_at = COALESCE(expires_at, created_at + INTERVAL '7 days')
WHERE expires_at IS NULL;

ALTER TABLE public.circle_join_requests
  ALTER COLUMN expires_at SET DEFAULT (now() + INTERVAL '7 days'),
  ALTER COLUMN expires_at SET NOT NULL;

-- Drop old check, allow guide statuses (+ rejected kept for legacy rows)
ALTER TABLE public.circle_join_requests
  DROP CONSTRAINT IF EXISTS circle_join_requests_status_check;

ALTER TABLE public.circle_join_requests
  ADD CONSTRAINT circle_join_requests_status_check
  CHECK (
    status IN (
      'pending',
      'approved',
      'expired',
      'cancelled',
      'rejected'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS one_pending_join_request_per_user
  ON public.circle_join_requests (circle_id, applicant_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_join_requests_applicant
  ON public.circle_join_requests (applicant_id, status);

-- ---------------------------------------------------------------------------
-- 2) circle_recommendations — decision + responded_at (guide: join_recommendations)
--    Keep physical table name for 007 compat; expose compatibility view.
-- ---------------------------------------------------------------------------
ALTER TABLE public.circle_recommendations
  ADD COLUMN IF NOT EXISTS decision TEXT,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

UPDATE public.circle_recommendations
SET decision = COALESCE(decision, status, 'pending')
WHERE decision IS NULL;

ALTER TABLE public.circle_recommendations
  ALTER COLUMN decision SET DEFAULT 'pending',
  ALTER COLUMN decision SET NOT NULL;

ALTER TABLE public.circle_recommendations
  DROP CONSTRAINT IF EXISTS circle_recommendations_decision_check;

ALTER TABLE public.circle_recommendations
  ADD CONSTRAINT circle_recommendations_decision_check
  CHECK (decision IN ('pending', 'recommended', 'unknown'));

-- Keep legacy status column in sync via trigger for older clients
CREATE OR REPLACE FUNCTION public.sync_recommendation_status_from_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.status := NEW.decision;
  IF NEW.decision IS DISTINCT FROM 'pending' AND NEW.responded_at IS NULL THEN
    NEW.responded_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_recommendation_decision ON public.circle_recommendations;
CREATE TRIGGER trg_sync_recommendation_decision
  BEFORE INSERT OR UPDATE OF decision ON public.circle_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_recommendation_status_from_decision();

CREATE OR REPLACE VIEW public.circle_join_recommendations AS
SELECT
  id,
  join_request_id AS request_id,
  recommender_id,
  decision,
  responded_at,
  created_at
FROM public.circle_recommendations;

-- ---------------------------------------------------------------------------
-- 3) Notifications event table (join approved etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_events_own ON public.notification_events;
CREATE POLICY notification_events_own ON public.notification_events
  FOR SELECT USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4) Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_blocked_between(a UUID, b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_blocks_v1 ub
    WHERE (ub.blocker_id = a AND ub.blocked_id = b)
       OR (ub.blocker_id = b AND ub.blocked_id = a)
  );
$$;

REVOKE ALL ON FUNCTION public.is_blocked_between(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_blocked_between(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.expire_stale_join_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.circle_join_requests
  SET status = 'expired', updated_at = now()
  WHERE id = p_request_id
    AND status = 'pending'
    AND expires_at <= now();
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) Invite preview — non-members get minimal circle info only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_circle_invite_preview(p_circle_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_circle public.circles%ROWTYPE;
  v_member_count INT;
  v_is_member BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT * INTO v_circle
  FROM public.circles
  WHERE id = p_circle_id AND status = 'open';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  SELECT COUNT(*) INTO v_member_count
  FROM public.circle_members
  WHERE circle_id = p_circle_id AND status = 'active';

  v_is_member := public.is_circle_member(p_circle_id);

  RETURN jsonb_build_object(
    'id', v_circle.id,
    'name', v_circle.name,
    'description', v_circle.description,
    'color', v_circle.color,
    'symbol', v_circle.symbol,
    'memberCount', v_member_count,
    'isMember', v_is_member
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_circle_invite_preview(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_circle_invite_preview(UUID) TO authenticated;

-- Applicant-safe progress (counts only — never recommender identities)
CREATE OR REPLACE FUNCTION public.get_join_request_progress(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_req public.circle_join_requests%ROWTYPE;
  v_count INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT * INTO v_req
  FROM public.circle_join_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_req.applicant_id <> auth.uid() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  PERFORM public.expire_stale_join_request(p_request_id);
  SELECT * INTO v_req FROM public.circle_join_requests WHERE id = p_request_id;

  SELECT COUNT(DISTINCT recommender_id) INTO v_count
  FROM public.circle_recommendations
  WHERE join_request_id = p_request_id
    AND decision = 'recommended';

  RETURN jsonb_build_object(
    'requestId', v_req.id,
    'circleId', v_req.circle_id,
    'status', v_req.status,
    'recommendedCount', v_count,
    'requiredCount', 3,
    'expiresAt', v_req.expires_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_join_request_progress(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_join_request_progress(UUID) TO authenticated;

-- Recommender inbox (applicant display name + circle name only)
CREATE OR REPLACE FUNCTION public.list_my_join_recommendations()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'recommendationId', r.id,
      'requestId', r.join_request_id,
      'decision', r.decision,
      'createdAt', r.created_at,
      'applicantDisplayName', p.display_name,
      'applicantAvatarUrl', p.avatar_url,
      'circleId', req.circle_id,
      'circleName', c.name,
      'requestedAt', req.created_at
    ) ORDER BY r.created_at DESC)
    FROM public.circle_recommendations r
    JOIN public.circle_join_requests req ON req.id = r.join_request_id
    JOIN public.circles c ON c.id = req.circle_id
    JOIN public.app_profiles p ON p.id = req.applicant_id
    WHERE r.recommender_id = auth.uid()
      AND r.decision = 'pending'
      AND req.status = 'pending'
      AND req.expires_at > now()
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_join_recommendations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_join_recommendations() TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) create_circle_join_request — single transaction
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_circle_join_request(
  target_circle_id UUID,
  recommender_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_circle public.circles%ROWTYPE;
  v_request_id UUID;
  v_id UUID;
  v_unique UUID[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT * INTO v_circle
  FROM public.circles
  WHERE id = target_circle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_circle.status <> 'open' THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  IF public.is_circle_member(target_circle_id) THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  IF recommender_ids IS NULL OR cardinality(recommender_ids) <> 3 THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  SELECT ARRAY(SELECT DISTINCT unnest(recommender_ids)) INTO v_unique;
  IF cardinality(v_unique) <> 3 THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  IF v_uid = ANY (recommender_ids) THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.circle_join_requests
    WHERE circle_id = target_circle_id
      AND applicant_id = v_uid
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  FOREACH v_id IN ARRAY recommender_ids
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.circle_members
      WHERE circle_id = target_circle_id
        AND user_id = v_id
        AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'VALIDATION';
    END IF;

    IF public.is_blocked_between(v_uid, v_id) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;
  END LOOP;

  INSERT INTO public.circle_join_requests (
    circle_id, applicant_id, status, expires_at, updated_at
  )
  VALUES (
    target_circle_id, v_uid, 'pending', now() + INTERVAL '7 days', now()
  )
  RETURNING id INTO v_request_id;

  FOREACH v_id IN ARRAY recommender_ids
  LOOP
    INSERT INTO public.circle_recommendations (
      join_request_id, recommender_id, decision, status
    )
    VALUES (v_request_id, v_id, 'pending', 'pending');

    INSERT INTO public.notification_events (user_id, event_type, payload)
    VALUES (
      v_id,
      'join_recommendation_requested',
      jsonb_build_object('requestId', v_request_id, 'circleId', target_circle_id)
    );
  END LOOP;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_circle_join_request(UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_circle_join_request(UUID, UUID[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) respond_circle_recommendation — count + auto-approve in one txn
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_circle_recommendation(
  recommendation_id UUID,
  decision TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_rec public.circle_recommendations%ROWTYPE;
  v_req public.circle_join_requests%ROWTYPE;
  v_count INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  -- "나중에" is client-only: leave pending. Server only accepts final decisions.
  IF decision NOT IN ('recommended', 'unknown') THEN
    RAISE EXCEPTION 'VALIDATION';
  END IF;

  SELECT * INTO v_rec
  FROM public.circle_recommendations
  WHERE id = recommendation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  IF v_rec.recommender_id <> v_uid THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF v_rec.decision <> 'pending' THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  SELECT * INTO v_req
  FROM public.circle_join_requests
  WHERE id = v_rec.join_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  PERFORM public.expire_stale_join_request(v_req.id);
  SELECT * INTO v_req FROM public.circle_join_requests WHERE id = v_rec.join_request_id;

  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  IF v_req.expires_at <= now() THEN
    UPDATE public.circle_join_requests
    SET status = 'expired', updated_at = now()
    WHERE id = v_req.id;
    RAISE EXCEPTION 'CONFLICT';
  END IF;

  IF NOT public.is_circle_member(v_req.circle_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.circle_recommendations
  SET decision = decision,
      responded_at = now(),
      status = decision
  WHERE id = recommendation_id;

  IF decision <> 'recommended' THEN
    RETURN v_req.status;
  END IF;

  SELECT COUNT(DISTINCT recommender_id) INTO v_count
  FROM public.circle_recommendations
  WHERE join_request_id = v_req.id
    AND decision = 'recommended';

  IF v_count >= 3 THEN
    INSERT INTO public.circle_members (circle_id, user_id, role, is_pioneer, status)
    VALUES (v_req.circle_id, v_req.applicant_id, 'member', false, 'active')
    ON CONFLICT (circle_id, user_id) DO NOTHING;

    UPDATE public.circle_join_requests
    SET status = 'approved',
        approved_at = now(),
        updated_at = now()
    WHERE id = v_req.id;

    -- Close remaining pending recommendations without revealing outcomes
    UPDATE public.circle_recommendations
    SET decision = 'unknown',
        responded_at = COALESCE(responded_at, now()),
        status = 'unknown'
    WHERE join_request_id = v_req.id
      AND decision = 'pending';

    INSERT INTO public.notification_events (user_id, event_type, payload)
    VALUES (
      v_req.applicant_id,
      'join_request_approved',
      jsonb_build_object('requestId', v_req.id, 'circleId', v_req.circle_id)
    );

    RETURN 'approved';
  END IF;

  RETURN 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.respond_circle_recommendation(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_circle_recommendation(UUID, TEXT) TO authenticated;

-- Cancel own pending request
CREATE OR REPLACE FUNCTION public.cancel_circle_join_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  UPDATE public.circle_join_requests
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_request_id
    AND applicant_id = auth.uid()
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONFLICT';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_circle_join_request(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_circle_join_request(UUID) TO authenticated;

-- Backward-compatible wrapper for Edge Function approve-circle-member
CREATE OR REPLACE FUNCTION public.recommend_join_request(
  p_request_id UUID,
  p_decision TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rec_id UUID;
  v_decision TEXT := p_decision;
BEGIN
  IF v_decision = 'later' THEN
    -- Client dismisses; leave pending
    RETURN 'pending';
  END IF;

  SELECT id INTO v_rec_id
  FROM public.circle_recommendations
  WHERE join_request_id = p_request_id
    AND recommender_id = auth.uid();

  IF v_rec_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;

  RETURN public.respond_circle_recommendation(v_rec_id, v_decision);
END;
$$;

-- ---------------------------------------------------------------------------
-- 8) RLS hardening — applicants never see recommender rows; members list gated
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS join_requests_select ON public.circle_join_requests;
DROP POLICY IF EXISTS join_requests_insert ON public.circle_join_requests;

-- Applicants may SELECT own request rows (status etc.) but never join recommendations via RLS.
-- Recommenders do NOT get blanket access to all circle join requests.
CREATE POLICY join_requests_select_applicant ON public.circle_join_requests
  FOR SELECT USING (applicant_id = auth.uid());

-- Direct INSERT blocked — only SECURITY DEFINER RPC creates rows
-- (no insert policy)

DROP POLICY IF EXISTS recommendations_select ON public.circle_recommendations;
DROP POLICY IF EXISTS recommendations_update ON public.circle_recommendations;

CREATE POLICY recommendations_select_own ON public.circle_recommendations
  FOR SELECT USING (recommender_id = auth.uid());

-- Direct UPDATE blocked — only SECURITY DEFINER RPC updates decisions
-- (no update policy for clients)

-- Members insert must not allow arbitrary membership (RPC only)
DROP POLICY IF EXISTS circle_members_insert ON public.circle_members;

-- Optional: allow self-row read of membership even before... members already use is_circle_member
-- Non-members cannot SELECT circle_members (existing policy).

-- Circles: allow invite preview path via RPC only; keep member/creator select.
-- Non-members still cannot SELECT circles table directly (by design).

COMMENT ON FUNCTION public.create_circle_join_request IS
  'Phase 4: create pending join + exactly 3 recommendations in one transaction';
COMMENT ON FUNCTION public.respond_circle_recommendation IS
  'Phase 4: record recommendation; auto-approve at 3 distinct recommended';
COMMENT ON FUNCTION public.get_join_request_progress IS
  'Phase 4: applicant-safe recommended count only';
