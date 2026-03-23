import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TELEGRAM_BOT_TOKEN = Deno.env.get('ADMIN_BOT_TOKEN') || '8732879647:AAGDmixVo2A88pL0Pr5TJW-QwgjxaCOBACs';
const JARVIS_BOT_TOKEN = Deno.env.get('JARVIS_TOKEN_BOT_TOKEN') || '8673468477:AAGpYEuvFsITBl-ZLOFKqDICVpLvEUG_gyU';

const TIER_INFO: Record<string, { emoji: string; bar: string; color: string }> = {
  mk1: { emoji: '⚡',     bar: '▓▓▓░░░░░░░', color: '🔵' },
  mk2: { emoji: '⚡⚡',   bar: '▓▓▓▓▓▓░░░░', color: '🟢' },
  mk3: { emoji: '⚡⚡⚡', bar: '▓▓▓▓▓▓▓▓▓▓', color: '🔴' },
};

// Генерация токена в стиле JARVIS
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

// Отправить токен пользователю через Jarvis Bot
async function sendTokenToUser(
  telegramUserId: number,
  tier: string,
  tierName: string,
  token: string,
  tokensCount: number,
  accessEnd: Date
) {
  const info = TIER_INFO[tier] || TIER_INFO.mk1;
  const endDate = accessEnd.toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Moscow',
  });
  const endTime = accessEnd.toLocaleTimeString('ru-RU', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow',
  });

  const text =
    `<b>╔══════════════════════════╗</b>\n` +
    `<b>║  ✅  ДОСТУП АКТИВИРОВАН   ║</b>\n` +
    `<b>╚══════════════════════════╝</b>\n\n` +
    `<b>ТАРИФ:</b> ${info.color} <b>Jarvis Industries ${tierName}</b>\n` +
    `<b>УРОВЕНЬ:</b> ${info.emoji} ${info.bar}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<b>🔐 ВАШ ТОКЕН ДОСТУПА:</b>\n\n` +
    `<code>${token}</code>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<b>⚡ ТОКЕНЫ:</b> <code>${tokensCount.toLocaleString('ru-RU')}</code>\n` +
    `<b>📅 ДОСТУП ДО:</b> ${endDate} ${endTime} МСК\n` +
    `<b>⏳ ОСТАЛОСЬ:</b> ✅ 30 дней\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>Скопируйте токен и введите его при запуске приложения Jarvis Industries.</i>\n\n` +
    `<b>⚠️ Не передавайте токен третьим лицам!</b>\n\n` +
    `Управление подпиской: /start`;

  const res = await fetch(`https://api.telegram.org/bot${JARVIS_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: telegramUserId,
      text,
      parse_mode: 'HTML',
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [{ text: '🔑 Открыть в боте', url: `https://t.me/JarvisTokenBot?start=token` }],
        ],
      }),
    }),
  });
  const data = await res.json();
  console.log(`[telegram-webhook] Token sent to user ${telegramUserId}:`, data.ok, data.description || '');
  return data.ok;
}

async function answerCallbackQuery(callbackQueryId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }),
  });
}

async function editMessageCaption(chatId: number, messageId: number, caption: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageCaption`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      caption,
      parse_mode: 'Markdown',
      reply_markup: JSON.stringify({ inline_keyboard: [] }),
    }),
  });
}

async function sendMessage(chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') || '';

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    console.log("[telegram-webhook] Received update:", JSON.stringify(body));

    const callbackQuery = body.callback_query;
    if (!callbackQuery) {
      return new Response('ok', { status: 200 });
    }

    const callbackQueryId = callbackQuery.id;
    const data = callbackQuery.data as string;
    const fromChatId = callbackQuery.message?.chat?.id;
    const messageId = callbackQuery.message?.message_id;
    const adminUsername = callbackQuery.from?.username || callbackQuery.from?.first_name || 'Админ';

    const adminIds = ADMIN_CHAT_ID.split(',').map(id => id.trim());
    if (!adminIds.includes(String(fromChatId))) {
      console.warn("[telegram-webhook] Unauthorized callback from:", fromChatId);
      await answerCallbackQuery(callbackQueryId, '⛔ Нет доступа');
      return new Response('ok', { status: 200 });
    }

    const parts = data.split(':');
    const action = parts[0];
    const shortId = parts[1];

    console.log("[telegram-webhook] Action:", action, "shortId:", shortId);

    const isJI = action.startsWith('ji_');
    const tableName = isJI ? 'jarvis_industries_purchases' : 'purchases';

    const { data: allPurchases, error: searchError } = await supabase
      .from(tableName)
      .select('*, profiles(username, telegram_id)')
      .order('purchased_at', { ascending: false })
      .limit(200);

    const purchase = allPurchases?.find((p: { id: string }) => {
      const pShortId = p.id.replace(/-/g, '').substring(0, 16);
      return pShortId === shortId;
    });

    if (searchError || !purchase) {
      console.error("[telegram-webhook] Purchase not found for shortId:", shortId, "in table:", tableName);
      await answerCallbackQuery(callbackQueryId, '❌ Заявка не найдена');
      return new Response('ok', { status: 200 });
    }

    const profileId = purchase.profile_id;
    const profile = purchase.profiles as { username: string; telegram_id: string } | null;
    const userName = profile?.username || purchase.username || 'Пользователь';
    const userTelegramId = profile?.telegram_id || purchase.telegram_id || '';

    const productDisplayName = isJI
      ? `${purchase.tier_name} (${purchase.tokens?.toLocaleString('ru-RU')} токенов)`
      : purchase.product_name;

    if (action === 'ok' || action === 'ji_ok') {
      const now = new Date();
      const accessEnd = new Date(now);
      accessEnd.setDate(accessEnd.getDate() + 30);

      if (isJI) {
        await supabase
          .from('jarvis_industries_purchases')
          .update({
            status: 'approved',
            reviewed_at: now.toISOString(),
            access_start: now.toISOString(),
            access_end: accessEnd.toISOString(),
          })
          .eq('id', purchase.id);
      } else {
        await supabase
          .from('purchases')
          .update({ status: 'approved', reviewed_at: now.toISOString() })
          .eq('id', purchase.id);
      }

      await answerCallbackQuery(callbackQueryId, '✅ Покупка одобрена!');

      // ── Для JI: генерируем и отправляем токен пользователю ──────────────
      let tokenResult = '';
      if (isJI) {
        try {
          const token = generateToken(purchase.tier as string);

          // Сохраняем токен в БД
          await supabase.from('jarvis_app_tokens').insert({
            purchase_id: purchase.id,
            profile_id: profileId || null,
            token,
            tier: purchase.tier,
            tier_name: purchase.tier_name,
            tokens_count: purchase.tokens,
            telegram_id: userTelegramId,
            username: userName,
            issued_at: now.toISOString(),
            expires_at: accessEnd.toISOString(),
            is_active: true,
          });

          // Отправляем токен пользователю если есть числовой Telegram ID
          let sentToUser = false;
          if (userTelegramId.startsWith('@id_')) {
            const userId = parseInt(userTelegramId.replace('@id_', ''), 10);
            if (!isNaN(userId)) {
              sentToUser = await sendTokenToUser(
                userId,
                purchase.tier as string,
                purchase.tier_name as string,
                token,
                purchase.tokens as number,
                accessEnd
              );
            }
          }

          tokenResult = sentToUser
            ? `\n🔑 Токен выдан: \`${token}\`\n✅ Отправлен пользователю в Telegram`
            : `\n🔑 Токен выдан: \`${token}\`\n⚠️ Не удалось отправить в Telegram (нет ID)`;

          console.log(`[telegram-webhook] Token issued: ${token}, sent: ${sentToUser}`);
        } catch (e) {
          console.error('[telegram-webhook] Token generation error:', e);
          tokenResult = '\n⚠️ Ошибка при генерации токена';
        }
      }

      // ── Добавляем в группу ───────────────────────────────────────────────
      const SUPABASE_URL_VAL = Deno.env.get('SUPABASE_URL')!;
      const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
      let inviteResult = '';
      try {
        const inviteRes = await fetch(`${SUPABASE_URL_VAL}/functions/v1/invite-to-group`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
          body: JSON.stringify({ purchaseId: purchase.id, isJarvisIndustries: isJI }),
        });
        const inviteData = await inviteRes.json();
        console.log("[telegram-webhook] Invite result:", inviteData);
        if (inviteData.success) {
          inviteResult = inviteData.invite_link
            ? `\n🔗 Ссылка для входа: ${inviteData.invite_link}`
            : `\n✅ Добавлен в группу *${inviteData.group}* автоматически`;
        } else {
          inviteResult = `\n⚠️ Не удалось добавить в группу: ${inviteData.error}`;
        }
      } catch (e) {
        console.error("[telegram-webhook] Invite error:", e);
        inviteResult = '\n⚠️ Ошибка при добавлении в группу';
      }

      const accessEndStr = isJI
        ? `\n📅 Доступ до: *${accessEnd.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric' })}*`
        : '';

      if (fromChatId && messageId) {
        await editMessageCaption(
          fromChatId,
          messageId,
          `✅ *ОДОБРЕНО* — @${adminUsername}\n\n` +
          `👤 Пользователь: *${userName}*\n` +
          `📦 Товар: *${productDisplayName}*\n` +
          `💰 Сумма: *${purchase.price} ₽*\n` +
          `🕐 Рассмотрено: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}` +
          accessEndStr +
          tokenResult +
          inviteResult
        );
      }

      for (const adminId of adminIds) {
        if (String(adminId) !== String(fromChatId)) {
          await sendMessage(adminId, `✅ Заявка *${productDisplayName}* для *${userName}* одобрена @${adminUsername}${accessEndStr}${tokenResult}${inviteResult}`);
        }
      }

      console.log("[telegram-webhook] Purchase approved:", purchase.id, isJI ? `access until ${accessEnd.toISOString()}` : '');

    } else if (action === 'no' || action === 'ji_no') {
      await supabase
        .from(tableName)
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', purchase.id);

      await answerCallbackQuery(callbackQueryId, '❌ Покупка отклонена');

      if (fromChatId && messageId) {
        await editMessageCaption(
          fromChatId,
          messageId,
          `❌ *ОТКЛОНЕНО* — @${adminUsername}\n\n` +
          `👤 Пользователь: *${userName}*\n` +
          `📦 Товар: *${productDisplayName}*\n` +
          `💰 Сумма: *${purchase.price} ₽*\n` +
          `🕐 Рассмотрено: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
        );
      }

      for (const adminId of adminIds) {
        if (String(adminId) !== String(fromChatId)) {
          await sendMessage(adminId, `❌ Заявка *${productDisplayName}* для *${userName}* отклонена @${adminUsername}`);
        }
      }

      console.log("[telegram-webhook] Purchase rejected:", purchase.id);

    } else if (action === 'bl') {
      const blockProfileId = profileId || purchase.profile_id;

      await supabase
        .from('profiles')
        .update({ is_blocked: true, block_reason: `Заблокирован администратором @${adminUsername}` })
        .eq('id', blockProfileId);

      await supabase
        .from(tableName)
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', purchase.id);

      await answerCallbackQuery(callbackQueryId, '🚫 Профиль заблокирован!');

      if (fromChatId && messageId) {
        await editMessageCaption(
          fromChatId,
          messageId,
          `🚫 *ЗАБЛОКИРОВАН* — @${adminUsername}\n\n` +
          `👤 Пользователь: *${userName}*\n` +
          `📱 Telegram ID: \`${userTelegramId}\`\n` +
          `📦 Товар: *${productDisplayName}*\n` +
          `🕐 Заблокирован: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
        );
      }

      for (const adminId of adminIds) {
        if (String(adminId) !== String(fromChatId)) {
          await sendMessage(adminId, `🚫 Профиль *${userName}* (${userTelegramId}) заблокирован @${adminUsername}`);
        }
      }

      console.log("[telegram-webhook] Profile blocked:", blockProfileId);
    }

    return new Response('ok', { status: 200 });

  } catch (error) {
    console.error("[telegram-webhook] Error:", error);
    return new Response('ok', { status: 200 });
  }
});