/**
 * Server-side home provisioning (calendar + photo seed)
 * Deploy: supabase functions deploy provision-profile --no-verify-jwt
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { userId, calendar, photoPath, photoCaption } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId required' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    if (Array.isArray(calendar) && calendar.length > 0) {
      await supabase.from('calendar_entries').upsert(
        calendar.map((entry: { date: string; content: string }) => ({
          user_id: userId,
          entry_date: entry.date,
          content: String(entry.content).slice(0, 5),
        })),
        { onConflict: 'user_id,entry_date' },
      );
    }

    const { count } = await supabase
      .from('photo_albums')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!count && photoPath) {
      await supabase.from('photo_albums').insert({
        user_id: userId,
        storage_path: photoPath,
        caption: String(photoCaption ?? '').slice(0, 10),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
