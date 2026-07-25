-- 5단계: Realtime private Presence — circle:{uuid} only
-- 007 / 008 / 010 / 011 수정 금지

-- ---------------------------------------------------------------------------
-- Topic → active membership (boolean only)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_active_circle_member_from_topic(
  target_topic TEXT,
  target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    target_topic ~ '^circle:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    AND target_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.circle_members cm
      WHERE cm.circle_id = (substring(target_topic FROM 8))::uuid
        AND cm.user_id = target_user_id
        AND cm.status = 'active'
    );
$$;

COMMENT ON FUNCTION public.is_active_circle_member_from_topic(TEXT, UUID) IS
  'Realtime RLS helper: topic circle:{uuid} + active membership. Returns boolean only.';

REVOKE ALL ON FUNCTION public.is_active_circle_member_from_topic(TEXT, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_circle_member_from_topic(TEXT, UUID)
  TO authenticated;

-- Convenience wrapper for app membership checks (same rule as is_circle_member)
-- Kept separate from topic helper for clarity.

-- ---------------------------------------------------------------------------
-- realtime.messages RLS — Presence receive / publish
-- Dashboard: disable "Allow public access" so private channels are enforced.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "circle members can receive presence" ON realtime.messages;
CREATE POLICY "circle members can receive presence"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.messages.extension = 'presence'
  AND public.is_active_circle_member_from_topic(
    (SELECT realtime.topic()),
    (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "circle members can publish presence" ON realtime.messages;
CREATE POLICY "circle members can publish presence"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.messages.extension = 'presence'
  AND public.is_active_circle_member_from_topic(
    (SELECT realtime.topic()),
    (SELECT auth.uid())
  )
);

-- Optional: deny broadcast on circle topics for now (phase 5 = presence only)
DROP POLICY IF EXISTS "deny circle broadcast until phase later" ON realtime.messages;
-- No broadcast policies → broadcast on private channels denied by default when public access off.
