-- Membership escalation: direct DML must fail for authenticated
-- INSERT/UPDATE/DELETE on circle_members, circle_recommendations, circle_join_requests

SELECT 'membership-escalation: revoke + RLS — jwt fixtures required'::text AS note;
