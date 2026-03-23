import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-merchantid, x-secret',
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

  for (let segment = 0; segment < 3; segment++) {
    let value = '';
    for (let i = 0; i < 5; i++) value += chars[Math.floor(Math.random() * chars.length)];
    segments.push(value);
  }

  return `${prefix}-${segments.join('-')}`;
}

async function sendAdminMessage(chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const data = await res.json();
  console.log('[platega-webhook] Telegram admin sendMessage:', { chatId, ok: data.ok, error: data.description });
}

async function sendTokenToUser(telegramUserId: number, tier: string, tierName: string, token: string, tokensCount: number, accessEnd: Date) {
  const info = TIER_INFO[tier] || TIER_INFO.mk1;
  const endDate = accessEnd.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Moscow',
  });
  const endTime = accessEnd.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  });

  const text =
    `<b>╔══════════════════════════╗</b>\n` +
    `<b>║  ✅  ДОСТУП АКТИВИРОВАН   ║</b>\n` +
    `<b>╚══════════════════════════╝</b>\n\n` +
    `<b>ТАРИФ:</b> ${info.color} <b>${tierName}</b>\n` +
    `<b>УРОВЕНЬ:</b> ${info.emoji} ${info.bar}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<b>🔐 ВАШ ТОКЕН ДОСТУПА:</b>\n\n` +
    `<code>${token}</code>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<b>⚡ ТОКЕНЫ:</b> <code>${tokensCount.toLocaleString('ru-RU')}</code>\n` +
    `<b>📅 ДОСТУП ДО:</b> ${endDate} ${endTime} МСК\n` +
    `<b>⏳ ОСТАЛОСЬ:</b> ✅ 30 дней\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>Скопируйте токен и введите его при запуске приложения Jarvis Industries.</i>`;

  const res = await fetch(`https://api.telegram.org/bot${JARVIS_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: telegramUserId,
      text,
      parse_mode: 'HTML',
    }),
  });
  const data = await res.json();
  console.log('[platega-webhook] Telegram user token send:', { telegramUserId, ok: data.ok, error: data.description });
  return data.ok;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const allHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    allHeaders[key] = value;
  });
  console.log('[platega-webhook] Incoming headers:', JSON.stringify(allHeaders));

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') || '';
    const PLATEGA_SECRET = Deno.env.get('PLATEGA_SECRET')!;
    const PLATEGA_MERCHANT_ID = Deno.env.get('PLATEGA_MERCHANT_ID')!;

    const bodyText = await req.text();
    console.log('[platega-webhook] Raw body:', bodyText);

    let body: any;
    try {
      body = JSON.parse(bodyText);
    } catch {
      console.error('[platega-webhook] Failed to parse body');
      return new Response('ok', { status: 200 });
    }

    console.log('[platega-webhook] Parsed body:', JSON.stringify(body));

    const incomingSecret = req.headers.get('X-Secret') || req.headers.get('x-secret');
    const incomingMerchantId = req.headers.get('X-MerchantId') || req.headers.get('x-merchantid');

    console.log('[platega-webhook] X-Secret match:', incomingSecret === PLATEGA_SECRET, '| X-MerchantId match:', incomingMerchantId === PLATEGA_MERCHANT_ID);

    if (incomingSecret && incomingSecret !== PLATEGA_SECRET) {
      console.error('[platega-webhook] Invalid X-Secret');
      return new Response('ok', { status: 200 });
    }

    if (incomingMerchantId && incomingMerchantId !== PLATEGA_MERCHANT_ID) {
      console.error('[platega-webhook] Invalid X-MerchantId');
      return new Response('ok', { status: 200 });
    }

    const { id: transactionId, status, payload, amount } = body;

    if (status !== 'CONFIRMED') {
      console.log('[platega-webhook] Status is not CONFIRMED, skipping:', status);
      return new Response('ok', { status: 200 });
    }

    let parsedPayload: any = {};
    try {
      parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : (payload || {});
    } catch (error) {
      console.error('[platega-webhook] Failed to parse payload:', payload, error);
    }

    const profileId = parsedPayload.profileId as string | null;
    const productName = parsedPayload.productName as string | null;
    const productId = parsedPayload.productId as string | null;
    const isJarvisIndustries = Boolean(parsedPayload.isJarvisIndustries);
    const tier = parsedPayload.tier as string | null;
    const tierName = (parsedPayload.tierName as string | null) || productName;
    const payloadTokens = Number(parsedPayload.tokens) || 0;
    const price = Number(parsedPayload.price) || Number(amount) || 0;

    if (!profileId || !productName) {
      console.error('[platega-webhook] Missing profileId or productName in payload:', payload);
      return new Response('ok', { status: 200 });
    }

    console.log('[platega-webhook] Processing confirmed payment:', {
      transactionId,
      profileId,
      productName,
      productId,
      isJarvisIndustries,
      tier,
      price,
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, telegram_id')
      .eq('id', profileId)
      .maybeSingle();

    const username = profile?.username || 'Неизвестный';
    const telegramId = profile?.telegram_id || '';
    const now = new Date();

    if (isJarvisIndustries) {
      if (!tier || !tierName) {
        console.error('[platega-webhook] Missing tier data for Jarvis Industries:', parsedPayload);
        return new Response('ok', { status: 200 });
      }

      const { data: existingJi } = await supabase
        .from('jarvis_industries_purchases')
        .select('id')
        .eq('profile_id', profileId)
        .eq('tier', tier)
        .eq('status', 'approved')
        .gte('purchased_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existingJi) {
        console.log('[platega-webhook] Duplicate Jarvis Industries purchase detected:', existingJi.id);
        return new Response('ok', { status: 200 });
      }

      const { data: tierData } = await supabase
        .from('jarvis_tiers')
        .select('tokens_count, duration_days')
        .eq('id', tier)
        .maybeSingle();

      const tokensCount = tierData?.tokens_count ?? payloadTokens;
      const durationDays = tierData?.duration_days ?? 30;
      const accessEnd = new Date(now);
      accessEnd.setDate(accessEnd.getDate() + durationDays);

      const { data: purchase, error: purchaseError } = await supabase
        .from('jarvis_industries_purchases')
        .insert({
          profile_id: profileId,
          tier,
          tier_name: tierName,
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
        console.error('[platega-webhook] Error saving Jarvis Industries purchase:', purchaseError);
        return new Response('ok', { status: 200 });
      }

      console.log('[platega-webhook] Jarvis Industries purchase saved:', purchase.id);

      const token = generateToken(tier);
      const { error: tokenError } = await supabase
        .from('jarvis_app_tokens')
        .insert({
          purchase_id: purchase.id,
          profile_id: profileId,
          token,
          tier,
          tier_id: tier,
          tier_name: tierName,
          tokens_count: tokensCount,
          tokens_used: 0,
          telegram_id: telegramId,
          username,
          issued_at: now.toISOString(),
          expires_at: accessEnd.toISOString(),
          is_active: true,
        });

      if (tokenError) {
        console.error('[platega-webhook] Error saving Jarvis token:', tokenError);
      } else {
        console.log('[platega-webhook] Jarvis token issued for purchase:', purchase.id);
      }

      let sentToUser = false;
      if (telegramId.startsWith('@id_')) {
        const telegramUserId = parseInt(telegramId.replace('@id_', ''), 10);
        if (!Number.isNaN(telegramUserId)) {
          sentToUser = await sendTokenToUser(telegramUserId, tier, tierName, token, tokensCount, accessEnd);
        }
      }

      let inviteSummary = 'не выполнено';
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
        console.log('[platega-webhook] Jarvis invite result:', inviteData);
        if (inviteData.success) {
          inviteSummary = inviteData.invite_link ? `ссылка: ${inviteData.invite_link}` : 'добавлен автоматически';
        } else {
          inviteSummary = inviteData.error || 'ошибка';
        }
      } catch (error) {
        console.error('[platega-webhook] Jarvis invite error:', error);
        inviteSummary = 'ошибка invite-to-group';
      }

      if (ADMIN_CHAT_ID) {
        const adminIds = ADMIN_CHAT_ID.split(',').map((id: string) => id.trim()).filter(Boolean);
        const message =
          `✅ АВТООПЛАТА ПОДТВЕРЖДЕНА (Platega)\n\n` +
          `🏭 Тариф: ${tierName}\n` +
          `👤 Пользователь: ${username}\n` +
          `📱 Telegram ID: ${telegramId}\n` +
          `💰 Сумма: ${price} руб\n` +
          `⚡ Токены: ${tokensCount.toLocaleString('ru-RU')}\n` +
          `🔑 Токен: ${token}\n` +
          `📨 Отправка токена: ${sentToUser ? 'успешно' : 'не отправлен'}\n` +
          `👥 Группа: ${inviteSummary}\n\n` +
          `ID покупки: ${purchase.id}\n` +
          `ID транзакции: ${transactionId}`;

        for (const adminId of adminIds) {
          await sendAdminMessage(adminId, message);
        }
      }

      return new Response('ok', { status: 200 });
    }

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
      console.log('[platega-webhook] Duplicate purchase detected:', existing.id);
      return new Response('ok', { status: 200 });
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
      console.error('[platega-webhook] Error saving purchase:', purchaseError);
      return new Response('ok', { status: 200 });
    }

    console.log('[platega-webhook] Purchase saved:', purchase.id);

    if (ADMIN_CHAT_ID) {
      const adminIds = ADMIN_CHAT_ID.split(',').map((id: string) => id.trim()).filter(Boolean);
      const message =
        `✅ АВТООПЛАТА ПОДТВЕРЖДЕНА (Platega)\n\n` +
        `👤 Пользователь: ${username}\n` +
        `📱 Telegram ID: ${telegramId}\n` +
        `📦 Товар: ${productName}\n` +
        `💰 Сумма: ${price} руб\n` +
        `💳 Метод: Platega (СБП / Карты РФ / Крипто)\n\n` +
        `ID покупки: ${purchase.id}\n` +
        `ID транзакции: ${transactionId}`;

      for (const adminId of adminIds) {
        await sendAdminMessage(adminId, message);
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
      console.log('[platega-webhook] Invite result:', inviteData);
    } catch (error) {
      console.error('[platega-webhook] Invite error:', error);
    }

    return new Response('ok', { status: 200 });
  } catch (error) {
    console.error('[platega-webhook] Error:', error);
    return new Response('ok', { status: 200 });
  }
});