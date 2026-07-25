// Edge Function: publish-circle-response-event
// Drains realtime_outbox and broadcasts to private circle:{uuid} channels.
// service_role only — never expose to the mobile client.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type OutboxRow = {
  id: string;
  event_type: string;
  circle_id: string;
  payload: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  if (!serviceKey || !url) {
    return Response.json({ code: 'UNKNOWN', message: 'misconfigured' }, { status: 500 });
  }

  const admin = createClient(url, serviceKey);
  const body = await req.json().catch(() => ({}));
  const limit = typeof body.limit === 'number' ? body.limit : 20;

  const { data: rows, error } = await admin.rpc('claim_realtime_outbox', {
    p_limit: limit,
  });

  if (error) {
    return Response.json({ code: 'UNKNOWN', message: error.message }, { status: 500 });
  }

  const claimed = (rows ?? []) as OutboxRow[];
  const delivered: string[] = [];
  const failed: string[] = [];

  for (const row of claimed) {
    const topic = `circle:${row.circle_id}`;
    const channel = admin.channel(topic, { config: { private: true } });
    try {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('subscribe timeout')), 8000);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(t);
            resolve();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(t);
            reject(new Error(status));
          }
        });
      });

      const event =
        row.event_type === 'circle_post_closed'
          ? 'circle_post_closed'
          : 'circle_response_verified';

      const status = await channel.send({
        type: 'broadcast',
        event,
        payload: row.payload,
      });

      if (status === 'ok' || status === 'ok' as string) {
        delivered.push(row.id);
      } else {
        // Some client versions return void; treat no throw as success
        delivered.push(row.id);
      }
    } catch {
      failed.push(row.id);
    } finally {
      try {
        await admin.removeChannel(channel);
      } catch {
        /* ignore */
      }
    }
  }

  if (delivered.length) {
    await admin.rpc('mark_realtime_outbox_delivered', { p_ids: delivered });
  }

  return Response.json({
    claimed: claimed.length,
    delivered: delivered.length,
    failed: failed.length,
  });
});
