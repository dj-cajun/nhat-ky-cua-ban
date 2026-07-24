-- Live: non-member / wrong-topic Presence on realtime.messages must fail.
-- Requires JWT fixtures + private channels (Dashboard: Allow public access = off).

SELECT 'realtime-presence-rls: use is_active_circle_member_from_topic + private:true'::text AS note;
