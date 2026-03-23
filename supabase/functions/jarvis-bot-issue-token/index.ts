import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateToken(tier: string): string {
  const prefix = `JRV-${tier.toUpperCase()}`;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments = [];
  for (let s = 0; s < 3; s++) {
    let seg = '';
    for (let i = 0; i < 5; i++) seg += chars[Math.floor(Math.random() * chars.length)];
    segments.push(seg);
  }
  return `${prefix}-${segments.join('-')}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { purchaseId, telegramId } = await req.json();
    if (!purchaseId) {
      return new Response(JSON.stringify({ error: 'purchaseId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[jarvis-bot-issue-token] purchaseId: ${purchaseId}, tgId: ${telegramId}`);

    // Проверяем покупку
    const { data: purchase, error } = await supabase
      .from('jarvis_industries_purchases')
      .select('*')
      .eq('id', purchaseId)
      .eq('status', 'approved')
      .single();

    if (error || !purchase) {
      return new Response(JSON.stringify({ error: 'Purchase not found or not approved' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Проверяем что подписка ещё активна
    if (purchase.access_end && new Date(purchase.access_end).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: 'Subscription expired' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Проверяем существующий активный токен
    const { data: existing } = await supabase
      .from('jarvis_app_tokens')
      .select('token')
      .eq('purchase_id', purchaseId)
      .eq('is_active', true)
      .single();

    if (existing) {
      console.log(`[jarvis-bot-issue-token] Returning existing token`);
      return new Response(JSON.stringify({ token: existing.token, isNew: false }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Генерируем новый токен
    const token = generateToken(purchase.tier as string);
    await supabase.from('jarvis_app_tokens').insert({
      purchase_id: purchaseId,
      profile_id: purchase.profile_id,
      token,
      tier: purchase.tier,
      tier_name: purchase.tier_name,
      tokens_count: purchase.tokens,
      telegram_id: purchase.telegram_id,
      username: purchase.username,
      issued_at: new Date().toISOString(),
      expires_at: purchase.access_end,
      is_active: true,
    });

    console.log(`[jarvis-bot-issue-token] New token issued: ${token}`);
    return new Response(JSON.stringify({ token, isNew: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[jarvis-bot-issue-token] Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
