import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = 'https://ldvlahtoiwimroycqcav.supabase.co';

// Все боты и их webhook endpoints
const BOTS = [
  {
    name: 'Admin Bot (payments)',
    token: Deno.env.get('ADMIN_BOT_TOKEN') || '8732879647:AAGDmixVo2A88pL0Pr5TJW-QwgjxaCOBACs',
    webhook: `${SUPABASE_URL}/functions/v1/telegram-webhook`,
  },
  {
    name: 'Jarvis Token Bot',
    token: Deno.env.get('JARVIS_TOKEN_BOT_TOKEN') || '8673468477:AAGpYEuvFsITBl-ZLOFKqDICVpLvEUG_gyU',
    webhook: `${SUPABASE_URL}/functions/v1/jarvis-bot`,
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const results = [];

    for (const bot of BOTS) {
      console.log(`[setup-webhook] Registering webhook for ${bot.name}: ${bot.webhook}`);

      const res = await fetch(`https://api.telegram.org/bot${bot.token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: bot.webhook }),
      });

      const data = await res.json();
      console.log(`[setup-webhook] ${bot.name} result:`, data);
      results.push({ bot: bot.name, ...data });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[setup-webhook] Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
