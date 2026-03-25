import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_BOT_TOKEN = Deno.env.get('ADMIN_BOT_TOKEN')!;
const JARVIS_BOT_TOKEN = Deno.env.get('JARVIS_TOKEN_BOT_TOKEN')!;

const TIER_INFO: Record<string, { emoji: string; bar: string; color: string }> = {
  mk1: { emoji: '⚡', bar: '▓▓▓░░░░░░░', color: '🔵' },
  mk2: { emoji: '⚡⚡', bar: '▓▓▓▓▓▓░░░░', color: '🟢' },
  mk3: { emoji: '⚡⚡⚡', bar: '▓▓▓▓▓▓▓▓▓▓', color: '🔴' },
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

async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  const data = await res.json();
  console.log('[check-payment] Telegram sendMessage:', { chatId, ok: data.ok, error: data.description });
  return data.ok;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PLATEGA_SECRET = Deno.env.get('PLATEGA_SECRET');
    const PLATEGA_MERCHANT_ID = Deno.env.get('PLATEGA_MERCHANT_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') || '';

    if (!PLATEGA_SECRET || !PLATEGA_MERCHANT_ID) {
      return new Response(JSON.stringify({ error: 'Платёжный сервис не настроен' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      transactionId,
      profileId,
      productName,
      productId,
      price,
      isJarvisIndustries = false,
      tier = null,
      tierName = null,
      tokens = 0,
    } = body;

    console.log('[check-payment] Checking transaction', { transactionId, profileId, productName, price, isJarvisIndustries, tier });

    const response = await fetch(`https://app.platega.io/transaction/${transactionId}`, {
      headers: {
        'X-MerchantId': PLATEGA_MERCHANT_ID,
        'X-Secret': PLATEGA_SECRET,
      },
    });

    const data = await response.json();
    console.log('[check-payment] Platega response', { status: data.status });

    if (data.status !== 'CONFIRMED') {
      return new Response(JSON.stringify({ status: data.status }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Получаем профиль
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, telegram_id')
      .eq('id', profileId)
      .maybeSingle();

    const username = profile?.username || 'Неизвестный';
    const telegramId = profile?.telegram_id || '';
    const now = new Date();

    if (isJarvisIndustries && tier) {
      // ── Jarvis Industries ──────────────────────────────────────────
      const { data: existingJi } = await supabase
        .from('jarvis_industries_purchases')
        .select('id')
        .eq('profile_id', profileId)
        .eq('tier', tier)
        .eq('status', 'approved')
        .gte('purchased_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existingJi) {
        console.log('[check-payment] Duplicate JI purchase, skipping:', existingJi.id);
        return new Response(JSON.stringify({ status: 'CONFIRMED' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: tierData } = await supabase
        .from('jarvis_tiers')
        .select('tokens_count, duration_days')
        .eq('id', tier)
        .maybeSingle();

      const tokensCount = tierData?.tokens_count ?? Number(tokens) ?? 0;
      const durationDays = tierData?.duration_days ?? 30;
      const accessEnd = new Date(now);
      accessEnd.setDate(accessEnd.getDate() + durationDays);

      const { data: purchase, error: purchaseError } = await supabase
        .from('jarvis_industries_purchases')
        .insert({
          profile_id: profileId,
          tier,
          tier_name: tierName || productName,
          tokens: tokensCount,
          price,
          status: 'approved',
          payment_method: 'Platega (авто)',
          username,
          telegram_id: telegramId,
          purchased_at: now.toISOString(),
          reviewed_at: now.toISOString(),
          access_start: now.toISOString(),
          access_end: accessEnd.toISOString(),
        })
        .select()
        .single();

      if (purchaseError || !purchase) {
        console.error('[check-payment] JI purchase insert error:', purchaseError);
        return new Response(JSON.stringify({ status: 'CONFIRMED', error: 'DB error' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('[check-payment] JI purchase saved:', purchase.id);

      // Генерируем токен
      const token = generateToken(tier);
      await supabase.from('jarvis_app_tokens').insert({
        purchase_id: purchase.id,
        profile_id: profileId,
        token,
        tier,
        tier_id: tier,
        tier_name: tierName || productName,
        tokens_count: tokensCount,
        tokens_used: 0,
        telegram_id: telegramId,
        username,
        issued_at: now.toISOString(),
        expires_at: accessEnd.toISOString(),
        is_active: true,
      });

      console.log('[check-payment] JI token issued:', token);

      // Отправляем токен пользователю
      if (telegramId.startsWith('@id_')) {
        const tgUserId = parseInt(telegramId.replace('@id_', ''), 10);
        if (!isNaN(tgUserId)) {
          const info = TIER_INFO[tier] || TIER_INFO.mk1;
          const endDate = accessEnd.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Moscow' });
          const endTime = accessEnd.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });

          const userMsg =
            `<b>╔══════════════════════════╗</b>\n` +
            `<b>║  ✅  ДОСТУП АКТИВИРОВАН   ║</b>\n` +
            `<b>╚══════════════════════════╝</b>\n\n` +
            `<b>ТАРИФ:</b> ${info.color} <b>${tierName || productName}</b>\n` +
            `<b>УРОВЕНЬ:</b> ${info.emoji} ${info.bar}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `<b>🔐 ВАШ ТОКЕН ДОСТУПА:</b>\n\n` +
            `<code>${token}</code>\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `<b>⚡ ТОКЕНЫ:</b> <code>${tokensCount.toLocaleString('ru-RU')}</code>\n` +
            `<b>📅 ДОСТУП ДО:</b> ${endDate} ${endTime} МСК\n\n` +
            `<i>Скопируйте токен и введите его при запуске приложения Jarvis Industries.</i>`;

          await sendTelegramMessage(JARVIS_BOT_TOKEN, String(tgUserId), userMsg);
        }
      }

      // Уведомляем админов
      if (ADMIN_CHAT_ID) {
        const adminIds = ADMIN_CHAT_ID.split(',').map((id: string) => id.trim()).filter(Boolean);
        const adminMsg =
          `✅ АВТООПЛАТА ПОДТВЕРЖДЕНА (Platega)\n\n` +
          `🏭 Тариф: ${tierName || productName}\n` +
          `👤 Пользователь: ${username}\n` +
          `📱 Telegram ID: ${telegramId}\n` +
          `💰 Сумма: ${price} руб\n` +
          `⚡ Токены: ${tokensCount.toLocaleString('ru-RU')}\n` +
          `🔑 Токен: ${token}\n\n` +
          `ID покупки: ${purchase.id}\n` +
          `ID транзакции: ${transactionId}`;

        for (const adminId of adminIds) {
          await sendTelegramMessage(ADMIN_BOT_TOKEN, adminId, adminMsg);
        }
      }

      // Добавляем в группу
      try {
        const inviteRes = await fetch(`${SUPABASE_URL}/functions/v1/invite-to-group`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ purchaseId: purchase.id, isJarvisIndustries: true }),
        });
        const inviteData = await inviteRes.json();
        console.log('[check-payment] JI invite result:', inviteData);
      } catch (e) {
        console.error('[check-payment] JI invite error:', e);
      }

    } else {
      // ── Обычный продукт ────────────────────────────────────────────
      const normalizedProductId = productId || productName.toLowerCase().replace(/\s+/g, '_');

      const { data: existing } = await supabase
        .from('purchases')
        .select('id')
        .eq('profile_id', profileId)
        .eq('product_id', normalizedProductId)
        .eq('status', 'approved')
        .gte('purchased_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existing) {
        console.log('[check-payment] Duplicate purchase, skipping:', existing.id);
        return new Response(JSON.stringify({ status: 'CONFIRMED' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          profile_id: profileId,
          product_id: normalizedProductId,
          product_name: productName,
          price,
          status: 'approved',
          payment_method: 'Platega (авто)',
          reviewed_at: now.toISOString(),
        })
        .select()
        .single();

      if (purchaseError || !purchase) {
        console.error('[check-payment] Purchase insert error:', purchaseError);
        return new Response(JSON.stringify({ status: 'CONFIRMED', error: 'DB error' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('[check-payment] Purchase saved:', purchase.id);

      if (ADMIN_CHAT_ID) {
        const adminIds = ADMIN_CHAT_ID.split(',').map((id: string) => id.trim()).filter(Boolean);
        const adminMsg =
          `✅ АВТООПЛАТА ПОДТВЕРЖДЕНА (Platega)\n\n` +
          `👤 Пользователь: ${username}\n` +
          `📱 Telegram ID: ${telegramId}\n` +
          `📦 Товар: ${productName}\n` +
          `💰 Сумма: ${price} руб\n\n` +
          `ID покупки: ${purchase.id}\n` +
          `ID транзакции: ${transactionId}`;

        for (const adminId of adminIds) {
          await sendTelegramMessage(ADMIN_BOT_TOKEN, adminId, adminMsg);
        }
      }

      try {
        const inviteRes = await fetch(`${SUPABASE_URL}/functions/v1/invite-to-group`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ purchaseId: purchase.id }),
        });
        const inviteData = await inviteRes.json();
        console.log('[check-payment] Invite result:', inviteData);
      } catch (e) {
        console.error('[check-payment] Invite error:', e);
      }
    }

    return new Response(JSON.stringify({ status: 'CONFIRMED' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[check-payment] Error:', error);
    return new Response(JSON.stringify({ error: 'Внутренняя ошибка сервера' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
