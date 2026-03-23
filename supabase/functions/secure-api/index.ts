import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_PASSWORD = 'ApexAdmin2025';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const body = req.method === 'POST' ? await req.json() : {};

    console.log(`[secure-api] action=${action}`);

    // ── MINI APP: загрузка данных по Telegram ID ──────────────────────
    if (action === 'miniapp-load') {
      const { telegramId } = body;
      if (!telegramId || typeof telegramId !== 'number') {
        return jsonResponse({ error: 'Invalid telegramId' }, 400);
      }

      const telegramIdStr = `@id_${telegramId}`;

      // Ищем профиль
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, telegram_id, is_blocked')
        .eq('telegram_id', telegramIdStr)
        .single();

      if (!profile) {
        return jsonResponse({ screen: 'no_profile' });
      }

      if (profile.is_blocked) {
        return jsonResponse({ screen: 'blocked' });
      }

      // Загружаем активные подписки
      const { data: purchases } = await supabase
        .from('jarvis_industries_purchases')
        .select('id, tier, tier_name, tokens, price, access_start, access_end, status')
        .eq('profile_id', profile.id)
        .eq('status', 'approved')
        .order('purchased_at', { ascending: false });

      const active = (purchases || []).filter(p =>
        p.access_end && new Date(p.access_end).getTime() > Date.now()
      );

      if (!active.length) {
        return jsonResponse({ screen: 'no_access' });
      }

      // Загружаем токены
      const ids = active.map(p => p.id);
      const { data: tokens } = await supabase
        .from('jarvis_app_tokens')
        .select('purchase_id, token')
        .eq('is_active', true)
        .in('purchase_id', ids);

      const tokenMap: Record<string, string> = {};
      (tokens || []).forEach(t => { tokenMap[t.purchase_id] = t.token; });

      const subscriptions = active.map(p => ({
        ...p,
        token: tokenMap[p.id] || null,
      }));

      return jsonResponse({ screen: 'dashboard', subscriptions });
    }

    // ── ADMIN: загрузка данных (требует пароль) ──────────────────────
    if (action === 'admin-load') {
      const { password } = body;
      if (password !== ADMIN_PASSWORD) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      const [purchasesRes, tokensRes] = await Promise.all([
        supabase
          .from('jarvis_industries_purchases')
          .select('*, profiles(username, telegram_id)')
          .order('purchased_at', { ascending: false }),
        supabase
          .from('jarvis_app_tokens')
          .select('*')
          .order('issued_at', { ascending: false }),
      ]);

      return jsonResponse({
        purchases: purchasesRes.data || [],
        tokens: tokensRes.data || [],
      });
    }

    // ── ADMIN: запуск проверки подписок ──────────────────────────────
    if (action === 'admin-check-subscriptions') {
      const { password } = body;
      if (password !== ADMIN_PASSWORD) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      // Вызываем check-subscriptions
      const res = await fetch(`${SUPABASE_URL}/functions/v1/check-subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      const data = await res.json();
      return jsonResponse(data);
    }

    return jsonResponse({ error: 'Unknown action' }, 400);

  } catch (e) {
    console.error('[secure-api] Error:', e);
    return jsonResponse({ error: 'Internal error' }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
