// Edge Function: send-notification
// Expo Push — service secrets only in function env
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // service role is ONLY available here, never in the app
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceKey) {
    return Response.json({ code: 'UNKNOWN', message: 'misconfigured' }, { status: 500 });
  }

  const { userIds, title, body, data } = await req.json();
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

  const { data: tokens } = await admin
    .from('push_tokens')
    .select('expo_push_token')
    .in('user_id', userIds)
    .is('disabled_at', null);

  const messages = (tokens ?? []).map((t: { expo_push_token: string }) => ({
    to: t.expo_push_token,
    title,
    body,
    data,
  }));

  // Expo push API call would go here; stub returns count
  return Response.json({ queued: messages.length });
});
