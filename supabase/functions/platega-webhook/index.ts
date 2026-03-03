import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = '8732879647:AAGDmixVo2A88pL0Pr5TJW-QwgjxaCOBACs';

async function sendTelegramMessage(chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
  const data = await res.json();
  console.log("[platega-webhook] Telegram sendMessage:", { chatId, ok: data.ok, error: data.description });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') || '';
    const PLATEGA_SECRET = Deno.env.get('PLATEGA_SECRET')!;

    const body = await req.json();
    console.log("[platega-webhook] Received webhook:", JSON.stringify(body));

    // Platega присылает: { id, status, payload, amount, ... }
    const { id: transactionId, status, payload } = body;

    // Проверяем подпись если есть (безопасность)
    // Platega может присылать X-Secret в заголовке
    const secret = req.headers.get('X-Secret') || req.headers.get('x-secret');
    if (secret && secret !== PLATEGA_SECRET) {
      console.error("[platega-webhook] Invalid secret!");
      return new Response('Unauthorized', { status: 401 });
    }

    if (status !== 'CONFIRMED') {
      console.log("[platega-webhook] Status is not CONFIRMED:", status, "— skipping");
      return new Response('ok', { status: 200 });
    }

    // Достаём profileId и productName из payload
    let profileId: string | null = null;
    let productName: string | null = null;
    let productId: string | null = null;
    let price: number = 0;

    try {
      const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
      profileId = parsed.profileId;
      productName = parsed.productName;
      productId = parsed.productId;
      price = parsed.price || body.amount || 0;
    } catch (e) {
      console.error("[platega-webhook] Failed to parse payload:", payload, e);
    }

    // Если price не в payload — берём из тела webhook
    if (!price && body.amount) {
      price = body.amount;
    }

    if (!profileId || !productName) {
      console.error("[platega-webhook] Missing profileId or productName in payload:", payload);
      return new Response('Missing data', { status: 400 });
    }

    console.log("[platega-webhook] Processing CONFIRMED payment:", { transactionId, profileId, productName, price });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Защита от дублей
    const { data: existing } = await supabase
      .from('purchases')
      .select('id')
      .eq('profile_id', profileId)
      .eq('product_id', productId || productName.toLowerCase().replace(/\s+/g, '_'))
      .eq('status', 'approved')
      .gte('purchased_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .maybeSingle();

    if (existing) {
      console.log("[platega-webhook] Duplicate detected, skipping:", existing.id);
      return new Response('ok', { status: 200 });
    }

    // Получаем профиль
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, telegram_id')
      .eq('id', profileId)
      .maybeSingle();

    const username = profile?.username || 'Неизвестный';
    const telegramId = profile?.telegram_id || '';

    // Сохраняем покупку как approved
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        profile_id: profileId,
        product_id: productId || productName.toLowerCase().replace(/\s+/g, '_'),
        product_name: productName,
        price: price,
        status: 'approved',
        payment_method: 'Platega (авто)',
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (purchaseError || !purchase) {
      console.error("[platega-webhook] Error saving purchase:", purchaseError);
      return new Response('DB error', { status: 500 });
    }

    console.log("[platega-webhook] Purchase saved:", purchase.id);

    // Уведомляем всех админов
    if (ADMIN_CHAT_ID) {
      const adminIds = ADMIN_CHAT_ID.split(',').map((id: string) => id.trim()).filter(Boolean);
      const msg =
        `✅ *АВТООПЛАТА ПОДТВЕРЖДЕНА (Platega Webhook)*\n\n` +
        `👤 Пользователь: *${username}*\n` +
        `📱 Telegram ID: \`${telegramId}\`\n` +
        `📦 Товар: *${productName}*\n` +
        `💰 Сумма: *${price} ₽*\n` +
        `💳 Метод: *Platega (СБП / Карты РФ)*\n` +
        `🕐 Время: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\n\n` +
        `🆔 ID покупки: \`${purchase.id}\`\n` +
        `🆔 ID транзакции: \`${transactionId}\`\n` +
        `🤖 _Платёж подтверждён автоматически через Platega Webhook_`;

      for (const adminId of adminIds) {
        await sendTelegramMessage(adminId, msg);
      }
    }

    // Добавляем в группу
    try {
      const inviteRes = await fetch(`${SUPABASE_URL}/functions/v1/invite-to-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ purchaseId: purchase.id }),
      });
      const inviteData = await inviteRes.json();
      console.log("[platega-webhook] Invite result:", inviteData);
    } catch (e) {
      console.error("[platega-webhook] Invite error:", e);
    }

    return new Response('ok', { status: 200 });

  } catch (error) {
    console.error("[platega-webhook] Error:", error);
    return new Response('ok', { status: 200 });
  }
});