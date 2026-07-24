-- Recommendation RPC forgery
-- - applicant cannot respond_circle_recommendation for others' rows
-- - wrong recommender FORBIDDEN
-- - illegal decision VALIDATION
-- - double respond CONFLICT
-- - expired / cancelled CONFLICT

SELECT 'recommendation-rpc: jwt fixtures required'::text AS note;
