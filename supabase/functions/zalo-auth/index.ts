/**
 * Zalo OAuth token → Supabase-compatible JWT (scaffold)
 * Deploy: supabase functions deploy zalo-auth --no-verify-jwt
 *
 * Requires secrets: ZALO_APP_ID, ZALO_APP_SECRET, SUPABASE_JWT_SECRET
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { accessToken, zaloId, name } = await req.json();
    if (!accessToken || !zaloId) {
      return new Response(JSON.stringify({ error: 'Missing zalo credentials' }), { status: 400 });
    }

    // TODO: verify accessToken with Zalo Open API
    void name;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, zalo_id')
      .eq('zalo_id', zaloId)
      .maybeSingle();

    // TODO: sign JWT with zalo_id claim via SUPABASE_JWT_SECRET
    return new Response(
      JSON.stringify({
        profileId: profile?.id ?? null,
        zaloId,
        token: 'JWT_PLACEHOLDER',
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
