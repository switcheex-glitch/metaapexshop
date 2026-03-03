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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PLATEGA_SECRET = Deno.env.get('PLATEGA_SECRET');
    const PLATEGA_MERCHANT_ID = Deno.env.get('PLATEGA_MERCHANT_ID');

    if (!PLATEGA_SECRET || !PLATEGA_MERCHANT_ID) {
      console.error("[create-payment] Missing Platega credentials");
      return new Response(JSON.stringify({ error: 'Платёжный сервис не настроен' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { amount, productName, profileId, currency = 'RUB', paymentMethodId = 'kaspi' } = await req.json();

    if (!amount || !productName || !profileId) {
      return new Response(JSON.stringify({ error: 'Не указаны обязательные параметры' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentMethod = PAYMENT_METHOD_MAP[paymentMethodId] ?? 12;

    console.log("[create-payment] Creating payment", { amount, productName, profileId, currency, paymentMethod });

    const body = {
      paymentMethod,
      paymentDetails: { amount: Number(amount), currency },
      description: `Покупка: ${productName}`,
      return: 'https://vibetechnology.app/payment-success',
      failedUrl: 'https://vibetechnology.app/payment-failed',
      payload: JSON.stringify({ profileId, productName, productId: productName.toLowerCase().replace(/\s+/g, '_'), price: Number(amount) }),
    };

    const response = await fetch('https://app.platega.io/transaction/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MerchantId': PLATEGA_MERCHANT_ID,
        'X-Secret': PLATEGA_SECRET,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log("[create-payment] Platega response", { status: response.status, data });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.message || 'Ошибка создания платежа' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ redirect: data.redirect, transactionId: data.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("[create-payment] Error:", error);
    return new Response(JSON.stringify({ error: 'Внутренняя ошибка сервера' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});