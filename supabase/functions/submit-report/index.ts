// Edge Function: submit-report — stores content snapshot
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return Response.json({ code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const payload = await req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const { error } = await supabase.from('content_reports').insert({
    reporter_id: user.id,
    target_type: payload.targetType,
    target_id: payload.targetId,
    reason: payload.reason,
    status: 'open',
  });

  if (error) {
    return Response.json({ code: 'UNKNOWN', message: error.message }, { status: 400 });
  }

  return Response.json({ ok: true });
});
