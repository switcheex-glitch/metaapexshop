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
  console.log("[check-payment] Telegram sendMessage result:", { chatId, ok: data.ok, error: data.description });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PLATEGA_SECRET = Deno.env.get('PLATEGA_SECRET');
    const PLATEGA_MERCHANT_ID = Deno.env.get('PLATEGA_MERCHANT_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') || '';

    if (!PLATEGA_SECRET || !PLATEGA_MERCHANT_ID) {
      return new Response(JSON.stringify({ error: 'Платёжный сервис не настроен' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { transactionId, profileId, productName, productId, price } = await req.json();

    console.log("[check-payment] Checking transaction", { transactionId, profileId, productName, price });

    const response = await fetch(`https://app.platega.io/transaction/${transactionId}`, {
      headers: {
        'X-MerchantId': PLATEGA_MERCHANT_ID,
        'X-Secret': PLATEGA_SECRET,
      },
    });

    const data = await response.json();
    console.log("[check-payment] Platega response", { status: data.status, data });

    if (data.status === 'CONFIRMED') {
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      // Защита от дублей — проверяем была ли уже сохранена покупка за последние 10 минут
      const { data: existing } = await supabase
        .from('purchases')
        .select('id')
        .eq('profile_id', profileId)
        .eq('product_id', productId || productName.toLowerCase().replace(/\s+/g, '_'))
        .eq('status', 'approved')
        .gte('purchased_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existing) {
        console.log("[check-payment] Duplicate purchase detected, skipping:", existing.id);
        return new Response(JSON.stringify({ status: 'CONFIRMED' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Получаем профиль пользователя для уведомления
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, telegram_id')
        .eq('id', profileId)
        .maybeSingle();

      const username = profile?.username || 'Неизвестный';
      const telegramId = profile?.telegram_id || '';

      // Сохраняем покупку сразу со статусом approved
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

      if (purchaseError) {
        console.error("[check-payment] Error saving purchase:", purchaseError);
      } else {
        console.log("[check-payment] Purchase saved as approved:", purchase.id);

        // Отправляем уведомление всем админам в Telegram
        if (ADMIN_CHAT_ID) {
          const adminIds = ADMIN_CHAT_ID.split(',').map((id: string) => id.trim()).filter(Boolean);
          const msg =
            `✅ *АВТООПЛАТА ПОДТВЕРЖДЕНА*\n\n` +
            `👤 Пользователь: *${username}*\n` +
            `📱 Telegram ID: \`${telegramId}\`\n` +
            `📦 Товар: *${productName}*\n` +
            `💰 Сумма: *${price} ₽*\n` +
            `💳 Метод: *Platega (СБП / Карты РФ)*\n` +
            `🕐 Время: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}\n\n` +
            `🆔 ID покупки: \`${purchase.id}\`\n` +
            `🤖 _Платёж подтверждён автоматически через Platega_`;

          for (const adminId of adminIds) {
            await sendTelegramMessage(adminId, msg);
          }
        } else {
          console.warn("[check-payment] TELEGRAM_ADMIN_CHAT_ID not set, skipping notification");
        }

        // Автоматически добавляем пользователя в группу
        if (SUPABASE_ANON_KEY) {
          try {
            const inviteRes = await fetch(`${SUPABASE_URL}/functions/v1/invite-to-group`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
              body: JSON.stringify({ purchaseId: purchase.id }),
            });
            const inviteData = await inviteRes.json();
            console.log("[check-payment] Invite result:", inviteData);
          } catch (e) {
            console.error("[check-payment] Invite error:", e);
          }
        }
      }
    }

    return new Response(JSON.stringify({ status: data.status }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("[check-payment] Error:", error);
    return new Response(JSON.stringify({ error: 'Внутренняя ошибка сервера' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});