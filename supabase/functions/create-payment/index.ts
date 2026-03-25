import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Маппинг методов оплаты на коды Platega
const PAYMENT_METHOD_MAP: Record<string, number> = {
  sbp: 2,        // СБП QR (Россия)
  cards_ru: 10,  // Карты РФ (Мир, Visa, Mastercard)
  card: 11,      // Карточный эквайринг
  kaspi: 12,     // Международный эквайринг
  privat: 12,
  mono: 12,
  polski: 12,
  rb: 12,
  paypal: 12,
  crypto: 13,    // Криптовалюта
};

const METHOD_LABELS: Record<string, string> = {
  sbp: 'СБП',
  cards_ru: 'Карты РФ',
  crypto: 'Криптовалюта',
  kaspi: 'Kaspi',
  mono: 'MonoBank',
  rb: 'РБ',
  paypal: 'PayPal',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PLATEGA_SECRET = Deno.env.get('PLATEGA_SECRET');
    const PLATEGA_MERCHANT_ID = Deno.env.get('PLATEGA_MERCHANT_ID');
    const ADMIN_BOT_TOKEN = Deno.env.get('ADMIN_BOT_TOKEN') || '';
    const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') || '';

    console.log("[create-payment] PLATEGA_SECRET present:", !!PLATEGA_SECRET, "| PLATEGA_MERCHANT_ID present:", !!PLATEGA_MERCHANT_ID);

    if (!PLATEGA_SECRET || !PLATEGA_MERCHANT_ID) {
      console.error("[create-payment] Missing Platega credentials");
      return new Response(JSON.stringify({ error: 'Платёжный сервис не настроен' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      amount,
      productName,
      productId,
      profileId,
      currency = 'RUB',
      paymentMethodId = 'kaspi',
      isJarvisIndustries = false,
      tier = null,
      tierName = null,
      tokens = 0,
    } = body;

    console.log("[create-payment] Request:", JSON.stringify(body));

    if (!amount || !productName || !profileId) {
      return new Response(JSON.stringify({ error: 'Не указаны обязательные параметры' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentMethod = PAYMENT_METHOD_MAP[paymentMethodId] ?? 12;
    const normalizedProductId = productId || productName.toLowerCase().replace(/\s+/g, '_');

    // Получаем данные пользователя из профиля
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    let telegramId = '';
    let telegramIdNumeric = 0;
    let username = 'Неизвестный';
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.45.0');
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: profile } = await supabase
        .from('profiles')
        .select('telegram_id, username')
        .eq('id', profileId)
        .maybeSingle();
      telegramId = profile?.telegram_id || '';
      username = profile?.username || 'Неизвестный';
      // Извлекаем числовой ID из формата "@id_XXXXXXX" или просто числа
      if (telegramId.startsWith('@id_')) {
        telegramIdNumeric = parseInt(telegramId.replace('@id_', ''), 10) || 0;
      } else if (/^\d+$/.test(telegramId)) {
        telegramIdNumeric = parseInt(telegramId, 10) || 0;
      }
    } catch (e) {
      console.warn('[create-payment] Could not fetch profile:', e);
    }

    console.log("[create-payment] Creating payment", {
      amount,
      productName,
      normalizedProductId,
      profileId,
      telegramId,
      telegramIdNumeric,
      username,
      currency,
      paymentMethod,
      paymentMethodId,
      isJarvisIndustries,
      tier,
    });

    // Platega требует telegram_id (числовой) и package_id в payload
    const payloadData = {
      telegram_id: telegramIdNumeric || telegramId,
      package_id: normalizedProductId,
      profileId,
      productName,
      productId: normalizedProductId,
      price: Number(amount),
      isJarvisIndustries,
      tier,
      tierName: tierName || productName,
      tokens: Number(tokens) || 0,
    };

    const requestBody = {
      paymentMethod,
      paymentDetails: { amount: Number(amount), currency },
      description: `Покупка: ${productName}`,
      return: 'https://testzbt9.vercel.app/profile',
      failedUrl: 'https://testzbt9.vercel.app/',
      payload: JSON.stringify(payloadData),
    };

    console.log("[create-payment] Sending to Platega:", JSON.stringify(requestBody));
    console.log("[create-payment] MerchantId:", PLATEGA_MERCHANT_ID);

    const response = await fetch('https://app.platega.io/transaction/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MerchantId': PLATEGA_MERCHANT_ID,
        'X-Secret': PLATEGA_SECRET,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("[create-payment] Platega raw response:", response.status, responseText);

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }

    console.log("[create-payment] Platega parsed response:", { status: response.status, data });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.message || data.error || `Ошибка Platega: ${response.status}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Platega возвращает transactionId (не id)
    const transactionId = data.transactionId || data.id;
    console.log("[create-payment] Success! transactionId:", transactionId, "redirect:", data.redirect);

    // Отправляем уведомление о новой заявке на оплату в бот
    if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID) {
      const methodLabel = METHOD_LABELS[paymentMethodId] || paymentMethodId;
      const adminMsg =
        `🆕 НОВАЯ ЗАЯВКА НА ОПЛАТУ (Platega)\n\n` +
        `👤 Пользователь: ${username}\n` +
        `📱 Telegram ID: ${telegramId || 'нет'}\n` +
        `📦 Товар: ${productName}\n` +
        `💳 Метод: ${methodLabel}\n` +
        `💰 Сумма: ${amount} ${currency}\n\n` +
        `🔗 ID транзакции: ${transactionId}\n` +
        `⏳ Статус: PENDING (ожидает оплаты)`;

      const adminIds = ADMIN_CHAT_ID.split(',').map((id: string) => id.trim()).filter(Boolean);
      for (const adminId of adminIds) {
        try {
          const tgRes = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: adminId, text: adminMsg }),
          });
          const tgData = await tgRes.json();
          console.log('[create-payment] Admin notification sent to', adminId, ':', tgData.ok, tgData.description || '');
        } catch (e) {
          console.error('[create-payment] Failed to send admin notification:', e);
        }
      }
    }

    return new Response(JSON.stringify({ redirect: data.redirect, transactionId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("[create-payment] Error:", error);
    return new Response(JSON.stringify({ error: 'Внутренняя ошибка сервера: ' + String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});