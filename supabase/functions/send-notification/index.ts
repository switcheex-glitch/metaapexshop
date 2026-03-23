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

    console.log('[send-notification] ADMIN_BOT_TOKEN present:', !!ADMIN_BOT_TOKEN);
    console.log('[send-notification] ADMIN_CHAT_ID:', ADMIN_CHAT_ID);

    if (!ADMIN_BOT_TOKEN || !ADMIN_CHAT_ID) {
      console.error('[send-notification] Missing bot token or chat id');
      return new Response(JSON.stringify({ error: 'Missing bot config' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Читаем multipart form data
    const formData = await req.formData();
    const purchaseId = formData.get('purchase_id') as string;
    const isJI = formData.get('is_ji') === 'true';
    const photo = formData.get('photo') as File | null;

    console.log('[send-notification] purchaseId:', purchaseId, 'isJI:', isJI, 'photo:', photo?.name, photo?.size);

    if (!purchaseId) {
      return new Response(JSON.stringify({ error: 'Missing purchase_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Загружаем данные заявки
    const tableName = isJI ? 'jarvis_industries_purchases' : 'purchases';
    const { data: purchase, error: purchaseError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', purchaseId)
      .single();

    if (purchaseError || !purchase) {
      console.error('[send-notification] Purchase not found:', purchaseError);
      return new Response(JSON.stringify({ error: 'Purchase not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[send-notification] Purchase loaded:', purchase.id, purchase.status);

    const adminIds = ADMIN_CHAT_ID.split(',').map((id: string) => id.trim()).filter(Boolean);
    const results = [];

    for (const chatId of adminIds) {
      let caption = '';
      if (isJI) {
        caption =
          `🧾 НОВАЯ ЗАЯВКА — JARVIS INDUSTRIES\n\n` +
          `👤 Пользователь: ${purchase.username || 'неизвестно'}\n` +
          `📱 Telegram ID: ${purchase.telegram_id || 'нет'}\n` +
          `📦 Тариф: ${purchase.tier_name}\n` +
          `⚡ Токены: ${(purchase.tokens || 0).toLocaleString('ru-RU')}\n` +
          `💰 Клиент платит: ${(purchase.price || 0).toLocaleString('ru-RU')} руб\n` +
          `💳 Метод: ${purchase.payment_method || 'не указан'}\n` +
          `🕐 Время: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК\n\n` +
          `ID заявки: ${purchase.id}`;
      } else {
        caption =
          `🧾 НОВАЯ ЗАЯВКА НА ОПЛАТУ\n\n` +
          `👤 Пользователь: ${purchase.username || 'неизвестно'}\n` +
          `📱 Telegram ID: ${purchase.telegram_id || 'нет'}\n` +
          `📦 Товар: ${purchase.product_name}\n` +
          `💳 Метод: ${purchase.payment_method || 'не указан'}\n` +
          `🕐 Время: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК\n\n` +
          `💰 Клиент платит: ${(purchase.price || 0).toLocaleString('ru-RU')} руб\n\n` +
          `ID заявки: ${purchase.id}`;
      }

      const replyMarkup = JSON.stringify({
        inline_keyboard: [
          [
            { text: '✅ Одобрить', callback_data: `${isJI ? 'ji_ok' : 'ok'}:${purchaseId}` },
            { text: '❌ Отклонить', callback_data: `${isJI ? 'ji_no' : 'no'}:${purchaseId}` },
          ],
          [
            { text: '🚫 Заблокировать профиль', callback_data: `bl:${purchaseId}` },
          ],
        ],
      });

      let tgResult;

      if (photo && photo.size > 0) {
        // Отправляем с фото
        const fd = new FormData();
        fd.append('chat_id', chatId);
        fd.append('photo', photo, photo.name || 'screenshot.jpg');
        fd.append('caption', caption);
        fd.append('reply_markup', replyMarkup);

        console.log('[send-notification] Sending photo to chat:', chatId, 'size:', photo.size);

        const tgRes = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendPhoto`, {
          method: 'POST',
          body: fd,
        });
        tgResult = await tgRes.json();
      } else {
        // Отправляем текстом
        console.log('[send-notification] Sending text to chat:', chatId);

        const tgRes = await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: caption,
            reply_markup: replyMarkup,
          }),
        });
        tgResult = await tgRes.json();
      }

      console.log('[send-notification] Telegram result for', chatId, ':', tgResult.ok, tgResult.description || tgResult.error_code || '');
      results.push({ chatId, ok: tgResult.ok, description: tgResult.description });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('[send-notification] Error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
