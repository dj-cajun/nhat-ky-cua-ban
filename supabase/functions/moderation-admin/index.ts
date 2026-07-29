// Edge: moderation admin actions (service / moderator JWT only)
// Never ship service role to the mobile bundle.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const auth = req.headers.get('Authorization');
  if (!auth) {
    return Response.json({ code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) {
    return Response.json({ code: 'UNKNOWN', message: 'misconfigured' }, { status: 500 });
  }

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
  });

  const body = await req.json();
  const action = body.action as string;

  const allowed = new Set([
    'admin_review_report',
    'admin_resolve_report',
    'admin_dismiss_report',
    'admin_restrict_user',
    'admin_suspend_user',
    'admin_hide_content',
  ]);

  if (!allowed.has(action)) {
    return Response.json({ code: 'VALIDATION' }, { status: 400 });
  }

  const { data, error } = await userClient.rpc(action, body.args ?? {});
  if (error) {
    const status = /FORBIDDEN/i.test(error.message) ? 403 : 400;
    return Response.json({ code: 'FORBIDDEN', message: error.message }, { status });
  }

  return Response.json({ ok: true, data });
});
