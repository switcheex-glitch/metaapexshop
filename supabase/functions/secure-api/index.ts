import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Пароль читается из Supabase Secrets — в коде его нет
const ADMIN_PASSWORD_HASH = await hashString(Deno.env.get('ADMIN_PASSWORD')!);

// Rate limiting: IP → { count, resetAt }
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

async function hashString(str: string): Promise<string> {
  const data = new TextEncoder().encode(str + 'apex_secure_salt_2025');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (entry) {
    if (now > entry.resetAt) {
      loginAttempts.delete(ip);
    } else if (entry.count >= MAX_LOGIN_ATTEMPTS) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return { allowed: false, retryAfter };
    }
  }
  return { allowed: true };
}

function recordLoginAttempt(ip: string) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (entry && now < entry.resetAt) {
    entry.count++;
  } else {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOCKOUT_MINUTES * 60 * 1000 });
  }
}

function clearLoginAttempts(ip: string) {
  loginAttempts.delete(ip);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const body = req.method === 'POST' ? await req.json() : {};
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('cf-connecting-ip')
      || 'unknown';

    console.log(`[secure-api] action=${action} ip=${clientIp}`);

    // ── ADMIN LOGIN (с rate limiting) ────────────────────────────────
    if (action === 'admin-login') {
      const rateCheck = checkRateLimit(clientIp);
      if (!rateCheck.allowed) {
        console.warn(`[secure-api] Rate limited: ${clientIp}`);
        return jsonResponse({
          error: `Слишком много попыток. Повторите через ${rateCheck.retryAfter} сек.`,
        }, 429);
      }

      const { password } = body;
      if (!password || typeof password !== 'string') {
        return jsonResponse({ error: 'Пароль обязателен' }, 400);
      }

      const inputHash = await hashString(password);
      if (inputHash !== ADMIN_PASSWORD_HASH) {
        recordLoginAttempt(clientIp);
        const entry = loginAttempts.get(clientIp);
        const remaining = MAX_LOGIN_ATTEMPTS - (entry?.count || 0);
        console.warn(`[secure-api] Failed login from ${clientIp}, remaining: ${remaining}`);
        return jsonResponse({
          error: remaining > 0
            ? `Неверный пароль. Осталось попыток: ${remaining}`
            : `Аккаунт заблокирован на ${LOCKOUT_MINUTES} минут`,
        }, 401);
      }

      clearLoginAttempts(clientIp);
      console.log(`[secure-api] Admin login success from ${clientIp}`);
      return jsonResponse({ success: true });
    }

    // ── Проверка пароля для admin-* actions ──────────────────────────
    async function verifyAdmin(): Promise<boolean> {
      const { password } = body;
      if (!password || typeof password !== 'string') return false;
      const inputHash = await hashString(password);
      return inputHash === ADMIN_PASSWORD_HASH;
    }

    // ── MINI APP: загрузка данных по Telegram ID ──────────────────────
    if (action === 'miniapp-load') {
      const { telegramId } = body;
      if (!telegramId || typeof telegramId !== 'number') {
        return jsonResponse({ error: 'Invalid telegramId' }, 400);
      }

      const telegramIdStr = `@id_${telegramId}`;

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

    // ── ADMIN: загрузка данных ───────────────────────────────────────
    if (action === 'admin-load') {
      if (!(await verifyAdmin())) {
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
      if (!(await verifyAdmin())) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

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

    // ── ADMIN: удаление подписки ─────────────────────────────────────
    if (action === 'admin-delete-purchase') {
      if (!(await verifyAdmin())) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      const { purchaseId } = body;
      if (!purchaseId || typeof purchaseId !== 'string') {
        return jsonResponse({ error: 'purchaseId обязателен' }, 400);
      }

      console.log(`[secure-api] Deleting purchase ${purchaseId}`);

      // Удаляем связанные токены
      const { error: tokensError } = await supabase
        .from('jarvis_app_tokens')
        .delete()
        .eq('purchase_id', purchaseId);

      if (tokensError) {
        console.error('[secure-api] Error deleting tokens:', tokensError);
      }

      // Удаляем подписку
      const { error: purchaseError } = await supabase
        .from('jarvis_industries_purchases')
        .delete()
        .eq('id', purchaseId);

      if (purchaseError) {
        console.error('[secure-api] Error deleting purchase:', purchaseError);
        return jsonResponse({ error: purchaseError.message }, 500);
      }

      console.log(`[secure-api] Purchase ${purchaseId} deleted successfully`);
      return jsonResponse({ success: true });
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