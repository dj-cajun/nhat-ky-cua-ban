-- Phase 4.5 prep: RLS attack checklist (run manually against Supabase)
-- Not executed in CI without a live DB; documents required assertions.

-- 1) Applicant cannot SELECT circle_recommendations for their own request
-- 2) Applicant get_join_request_progress returns counts only
-- 3) Non-member cannot SELECT circle_members / circle_posts / anonymous_posts
-- 4) Direct INSERT into circle_members fails under RLS
-- 5) Direct UPDATE of circle_recommendations.decision fails under RLS
-- 6) create_circle_join_request with 2 ids raises VALIDATION
-- 7) respond_circle_recommendation as non-owner raises FORBIDDEN
-- 8) Third concurrent recommend results in a single membership row

-- Example (psql / supabase sql editor), as authenticated applicant JWT:
--   select * from circle_recommendations;  -- expect 0 rows (not assigned)
--   select public.get_join_request_progress('<request_id>');
--   insert into circle_members(circle_id, user_id) values (...);  -- expect fail
