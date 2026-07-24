// Edge Function: open-circle
// 비밀키 없음. JWT 검증 후 open_circle_from_draft RPC 호출.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return Response.json({ code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const { draftId } = await req.json();
  if (!draftId) {
    return Response.json({ code: 'VALIDATION', message: 'draftId required' }, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data, error } = await supabase.rpc('open_circle_from_draft', {
    p_draft_id: draftId,
  });

  if (error) {
    return Response.json({ code: 'UNKNOWN', message: error.message }, { status: 400 });
  }

  return Response.json({ circleId: data });
});
