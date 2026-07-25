// Edge Function: respond to join recommendation (phase 4)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return Response.json({ code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  const body = await req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // Prefer recommendationId; fall back to requestId wrapper for older clients
  if (body.recommendationId) {
    const { data, error } = await supabase.rpc('respond_circle_recommendation', {
      recommendation_id: body.recommendationId,
      decision: body.decision,
    });
    if (error) {
      return Response.json({ code: 'UNKNOWN', message: error.message }, { status: 400 });
    }
    return Response.json({ status: data });
  }

  const { data, error } = await supabase.rpc('recommend_join_request', {
    p_request_id: body.requestId,
    p_decision: body.decision,
  });

  if (error) {
    return Response.json({ code: 'UNKNOWN', message: error.message }, { status: 400 });
  }

  return Response.json({ status: data });
});
