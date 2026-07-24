// Edge Function: delete-account — uses service role for Auth user deletion
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return Response.json({ code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return Response.json({ code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  await admin.from('app_profiles').update({ display_name: '삭제된 사용자' }).eq('id', user.id);
  // Soft-hide content, schedule storage cleanup, then:
  await admin.auth.admin.deleteUser(user.id);

  return Response.json({ ok: true });
});
