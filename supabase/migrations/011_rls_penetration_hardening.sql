-- 4.5: RLS 침투 대응 harden (007·008·010 수정 금지)
-- - respond 시 차단 재검사
-- - 승인 전이(pending→approved) 한 번만 + 알림 1건
-- - authenticated의 민감 테이블 직접 DML 제거 (SECURITY DEFINER RPC만)
-- - diary-photos Storage private 정책
-- - SECURITY DEFINER 함수 EXECUTE 재확인

-- ---------------------------------------------------------------------------
-- 1) Hardened respond_circle_recommendation
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
  v_approved BOOLEAN := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

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

  -- Recommender must still be an active member
  IF NOT public.is_circle_member(v_req.circle_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  -- Re-check block at respond / pre-approve time (not only at create)
  IF public.is_blocked_between(v_uid, v_req.applicant_id) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE public.circle_recommendations
  SET decision = decision,
      responded_at = now(),
      status = decision
  WHERE id = recommendation_id;

  IF decision <> 'recommended' THEN
    RETURN 'pending';
  END IF;

  SELECT COUNT(DISTINCT recommender_id) INTO v_count
  FROM public.circle_recommendations
  WHERE join_request_id = v_req.id
    AND decision = 'recommended';

  IF v_count >= 3 THEN
    -- Any recommended pair blocked with applicant → abort whole txn
    IF EXISTS (
      SELECT 1
      FROM public.circle_recommendations r
      WHERE r.join_request_id = v_req.id
        AND r.decision = 'recommended'
        AND public.is_blocked_between(v_req.applicant_id, r.recommender_id)
    ) THEN
      RAISE EXCEPTION 'FORBIDDEN';
    END IF;

    INSERT INTO public.circle_members (circle_id, user_id, role, is_pioneer, status)
    VALUES (v_req.circle_id, v_req.applicant_id, 'member', false, 'active')
    ON CONFLICT (circle_id, user_id) DO NOTHING;

    -- Only the transition pending → approved runs once (concurrency-safe)
    UPDATE public.circle_join_requests
    SET status = 'approved',
        approved_at = now(),
        updated_at = now()
    WHERE id = v_req.id
      AND status = 'pending';

    IF FOUND THEN
      v_approved := true;

      UPDATE public.circle_recommendations
      SET decision = 'unknown',
          responded_at = COALESCE(responded_at, now()),
          status = 'unknown'
      WHERE join_request_id = v_req.id
        AND decision = 'pending';

      -- At most one approval notification
      IF NOT EXISTS (
        SELECT 1 FROM public.notification_events
        WHERE user_id = v_req.applicant_id
          AND event_type = 'join_request_approved'
          AND payload->>'requestId' = v_req.id::text
      ) THEN
        INSERT INTO public.notification_events (user_id, event_type, payload)
        VALUES (
          v_req.applicant_id,
          'join_request_approved',
          jsonb_build_object('requestId', v_req.id, 'circleId', v_req.circle_id)
        );
      END IF;
    END IF;

    RETURN 'approved';
  END IF;

  RETURN 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.respond_circle_recommendation(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_circle_recommendation(UUID, TEXT) TO authenticated;

-- Internal helpers: no client execute
REVOKE ALL ON FUNCTION public.expire_stale_join_request(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_recommendation_status_from_decision() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Defense in depth: revoke direct DML on join/membership tables
--    SECURITY DEFINER RPCs (owner) still write.
-- ---------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.circle_members FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.circle_join_requests FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.circle_recommendations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.notification_events FROM anon, authenticated;

-- Keep SELECT so RLS can return empty/allowed rows; no broad anon access needed
REVOKE ALL ON public.circle_members FROM anon;
REVOKE ALL ON public.circle_join_requests FROM anon;
REVOKE ALL ON public.circle_recommendations FROM anon;
GRANT SELECT ON public.circle_members TO authenticated;
GRANT SELECT ON public.circle_join_requests TO authenticated;
GRANT SELECT ON public.circle_recommendations TO authenticated;

-- View: same as underlying RLS (security_invoker when supported)
DROP VIEW IF EXISTS public.circle_join_recommendations;
CREATE VIEW public.circle_join_recommendations
WITH (security_invoker = true)
AS
SELECT
  id,
  join_request_id AS request_id,
  recommender_id,
  decision,
  responded_at,
  created_at
FROM public.circle_recommendations;

REVOKE ALL ON public.circle_join_recommendations FROM anon;
GRANT SELECT ON public.circle_join_recommendations TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Storage: private diary photos (path must start with auth.uid())
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'diary-photos',
  'diary-photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false;

DROP POLICY IF EXISTS diary_photos_select_own_or_shared ON storage.objects;
DROP POLICY IF EXISTS diary_photos_insert_own ON storage.objects;
DROP POLICY IF EXISTS diary_photos_update_own ON storage.objects;
DROP POLICY IF EXISTS diary_photos_delete_own ON storage.objects;

-- Owners can always read their objects; shared circle members via app_profiles share helper
CREATE POLICY diary_photos_select_own_or_shared ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'diary-photos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        AND public.shares_open_circle(((storage.foldername(name))[1])::uuid)
      )
    )
  );

CREATE POLICY diary_photos_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'diary-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY diary_photos_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'diary-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY diary_photos_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'diary-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 4) Realtime note (phase 5 prep): channel authorization must deny non-members.
--    Enforce via private channels + is_circle_member checks in Realtime auth hook /
--    supabase realtime authorization. No long-lived online rows in DB.
COMMENT ON FUNCTION public.is_circle_member(UUID) IS
  'Active membership check. Also gate Realtime circle:{id} subscribe (phase 5).';
