import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const ADMIN_BOT_TOKEN = Deno.env.get('ADMIN_BOT_TOKEN')!;
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;

    const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-webhook`;

    console.log('[setup-webhook] Setting webhook to:', webhookUrl);

    const res = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['callback_query'],
        drop_pending_updates: true,
      }),
    });

    const data = await res.json();
    console.log('[setup-webhook] Result:', data);

    // Также проверяем текущий webhook
    const infoRes = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/getWebhookInfo`);
    const infoData = await infoRes.json();
    console.log('[setup-webhook] Webhook info:', infoData);

    return new Response(JSON.stringify({ success: data.ok, result: data, webhookInfo: infoData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[setup-webhook] Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
