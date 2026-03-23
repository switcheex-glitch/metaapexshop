import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ADMIN_BOT_TOKEN = Deno.env.get('ADMIN_BOT_TOKEN')!;
    const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Читаем multipart form data
    const formData = await req.formData();
    const telegramId = formData.get('telegram_id') as string;
    const tierId = formData.get('tier_id') as string; // mk1, mk2, mk3
    const paymentMethod = formData.get('payment_method') as string;
    const photo = formData.get('photo') as File | null;

    console.log('[miniapp-purchase] telegramId:', telegramId, 'tierId:', tierId, 'method:', paymentMethod, 'photo:', photo?.name, photo?.size);

    if (!telegramId || !tierId) {
      return new Response(JSON.stringify({ error: 'Missing telegram_id or tier_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ищем профиль по telegram_id
    const tgIdFormatted = `@id_${telegramId}`;
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, telegram_id, is_blocked')
      .eq('telegram_id', tgIdFormatted)
      .single();

    if (profileError || !profile) {
      console.error('[miniapp-purchase] Profile not found for telegram_id:', tgIdFormatted);
      return new Response(JSON.stringify({ error: 'profile_not_found', message: 'Профиль не найден. Зарегистрируйтесь на сайте.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (profile.is_blocked) {
      return new Response(JSON.stringify({ error: 'blocked', message: 'Ваш аккаунт заблокирован.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Получаем данные тарифа
    const { data: tier, error: tierError } = await supabase
      .from('jarvis_tiers')
      .select('*')
      .eq('id', tierId)
      .single();

    if (tierError || !tier) {
      return new Response(JSON.stringify({ error: 'tier_not_found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[miniapp-purchase] Profile:', profile.username, '| Tier:', tier.full_name, tier.tokens_count, 'tokens');

    // Создаём заявку в БД
    const { data: purchase, error: purchaseError } = await supabase
      .from('jarvis_industries_purchases')
      .insert({
        profile_id: profile.id,
        tier: tier.id,
        tier_name: tier.full_name,
        tokens: tier.tokens_count,
        price: tier.price,
        status: 'pending',
        payment_method: paymentMethod || 'не указан',
        username: profile.username,
        telegram_id: profile.telegram_id,
        purchased_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (purchaseError || !purchase) {
      console.error('[miniapp-purchase] Purchase insert error:', purchaseError);
      return new Response(JSON.stringify({ error: 'purchase_failed', message: purchaseError?.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[miniapp-purchase] Purchase created:', purchase.id);

    // Отправляем уведомление в Telegram
    if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID) {
      const adminIds = ADMIN_CHAT_ID.split(',').map((id: string) => id.trim()).filter(Boolean);

      const caption =
        `🧾 НОВАЯ ЗАЯВКА — JARVIS INDUSTRIES 🏭\n\n` +
        `👤 Пользователь: ${profile.username || 'неизвестно'}\n` +
        `📱 Telegram ID: ${profile.telegram_id || 'нет'}\n` +
        `📦 Тариф: ${tier.full_name}\n` +
        `⚡ Токены: ${tier.tokens_count.toLocaleString('ru-RU')}\n` +
        `💰 Клиент платит: ${tier.price.toLocaleString('ru-RU')} руб\n` +
        `💳 Метод: ${paymentMethod || 'не указан'}\n` +
        `🕐 Время: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК\n` +
        `📲 Источник: Telegram Mini App\n\n` +
        `ID заявки: ${purchase.id}`;

      const replyMarkup = JSON.stringify({
        inline_keyboard: [
          [
            { text: '✅ Одобрить', callback_data: `ji_ok:${purchase.id}` },
            { text: '❌ Отклонить', callback_data: `ji_no:${purchase.id}` },
          ],
          [
            { text: '🚫 Заблокировать профиль', callback_data: `bl:${purchase.id}` },
          ],
        ],
      });

      for (const chatId of adminIds) {
        try {
          let tgResult;

          if (photo && photo.size > 0) {
            const fd = new FormData();
            fd.append('chat_id', chatId);
            fd.append('photo', photo, photo.name || 'screenshot.jpg');
            fd.append('caption', caption);
            fd.append('reply_markup', replyMarkup);

            const tgRes = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendPhoto`, {
              method: 'POST',
              body: fd,
            });
            tgResult = await tgRes.json();
          } else {
            const tgRes = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: caption, reply_markup: replyMarkup }),
            });
            tgResult = await tgRes.json();
          }

          console.log('[miniapp-purchase] Telegram result for', chatId, ':', tgResult.ok, tgResult.description || '');
        } catch (e) {
          console.error('[miniapp-purchase] Telegram send error:', e);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, purchase_id: purchase.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[miniapp-purchase] Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
