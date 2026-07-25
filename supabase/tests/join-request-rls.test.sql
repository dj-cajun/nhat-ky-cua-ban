-- Live DB: join-request RLS / RPC forgery checks (run via supabase db / sql editor)
-- Expect: each bad create leaves 0 join_requests / 0 recommendations / 0 memberships for applicant.

-- Requires test helpers that set request.jwt.claim.sub = applicant uid (pgTAP / supabase test wrappers).
-- This file documents required assertions for CI when SUPABASE_DB_URL is present.

-- 1) create with 2 recommenders → exception; count(*) = 0
-- 2) create with duplicate recommenders → exception; count = 0
-- 3) create with self → exception; count = 0
-- 4) create as existing member → exception
-- 5) second pending → exception; still 1 pending row only
-- 6) authenticated INSERT into circle_join_requests → fail (no privilege / RLS)
-- 7) authenticated UPDATE circle_join_requests.status → fail

SELECT 'join-request-rls: see 4.5 docs — execute with jwt fixtures'::text AS note;
