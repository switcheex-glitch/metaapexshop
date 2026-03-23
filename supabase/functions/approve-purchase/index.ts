import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_BOT_TOKEN = Deno.env.get('ADMIN_BOT_TOKEN')!;
const JARVIS_BOT_TOKEN = Deno.env.get('JARVIS_TOKEN_BOT_TOKEN')!;

const TIER_INFO: Record<string, { emoji: string; bar: string; color: string }> = {
  mk1: { emoji: '⚡',     bar: '▓▓▓░░░░░░░', color: '🔵' },
  mk2: { emoji: '⚡⚡',   bar: '▓▓▓▓▓▓░░░░', color: '🟢' },
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

async function sendTokenToUser(telegramUserId: number, tier: string, tierName: string, token: string, tokensCount: number, accessEnd: Date) {
  const info = TIER_INFO[tier] || TIER_INFO.mk1;
  const endDate = accessEnd.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Moscow' });
  const endTime = accessEnd.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });

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
    }),
  });
  const data = await res.json();
  console.log(`[approve-purchase] Token sent to user ${telegramUserId}:`, data.ok, data.description || '');
  return data.ok;
}

async function editMessageCaption(chatId: string, messageId: number, caption: string) {
  await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/editMessageCaption`, {
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
  await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') || '';

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const url = new URL(req.url);
    const action = url.searchParams.get('action'); // ok, no, bl, ji_ok, ji_no
    const purchaseId = url.searchParams.get('id');
    const adminId = url.searchParams.get('admin'); // chat_id of admin who clicked
    const messageId = url.searchParams.get('msg');  // message_id to edit

    console.log(`[approve-purchase] action=${action} purchaseId=${purchaseId} adminId=${adminId}`);

    if (!action || !purchaseId) {
      return new Response('Missing params', { status: 400, headers: corsHeaders });
    }

    const isJI = action.startsWith('ji_');
    const tableName = isJI ? 'jarvis_industries_purchases' : 'purchases';

    // Проверяем что admin авторизован
    const adminIds = ADMIN_CHAT_ID.split(',').map(id => id.trim());
    if (adminId && !adminIds.includes(adminId)) {
      return htmlResponse('⛔ Нет доступа');
    }

    // Загружаем заявку
    const { data: purchase, error } = await supabase
      .from(tableName)
      .select('*, profiles(username, telegram_id)')
      .eq('id', purchaseId)
      .single();

    if (error || !purchase) {
      console.error('[approve-purchase] Purchase not found:', purchaseId);
      return htmlResponse('❌ Заявка не найдена');
    }

    if (purchase.status !== 'pending') {
      return htmlResponse(`ℹ️ Заявка уже обработана (статус: ${purchase.status})`);
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
        await supabase.from('jarvis_industries_purchases').update({
          status: 'approved',
          reviewed_at: now.toISOString(),
          access_start: now.toISOString(),
          access_end: accessEnd.toISOString(),
        }).eq('id', purchaseId);
      } else {
        await supabase.from('purchases').update({
          status: 'approved',
          reviewed_at: now.toISOString(),
        }).eq('id', purchaseId);
      }

      let tokenResult = '';
      let inviteResult = '';

      // Для JI: генерируем токен
      if (isJI) {
        try {
          const token = generateToken(purchase.tier as string);
          await supabase.from('jarvis_app_tokens').insert({
            purchase_id: purchaseId,
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

          let sentToUser = false;
          if (userTelegramId.startsWith('@id_')) {
            const userId = parseInt(userTelegramId.replace('@id_', ''), 10);
            if (!isNaN(userId)) {
              sentToUser = await sendTokenToUser(userId, purchase.tier, purchase.tier_name, token, purchase.tokens, accessEnd);
            }
          }

          tokenResult = sentToUser
            ? `\n🔑 Токен: \`${token}\`\n✅ Отправлен пользователю`
            : `\n🔑 Токен: \`${token}\`\n⚠️ Не удалось отправить (нет ID)`;
        } catch (e) {
          console.error('[approve-purchase] Token error:', e);
          tokenResult = '\n⚠️ Ошибка генерации токена';
        }
      }

      // Добавляем в группу
      try {
        const inviteRes = await fetch(`${SUPABASE_URL}/functions/v1/invite-to-group`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ purchaseId, isJarvisIndustries: isJI }),
        });
        const inviteData = await inviteRes.json();
        if (inviteData.success) {
          inviteResult = inviteData.invite_link
            ? `\n🔗 Ссылка для входа: ${inviteData.invite_link}`
            : `\n✅ Добавлен в группу автоматически`;
        } else {
          inviteResult = `\n⚠️ Группа: ${inviteData.error || 'ошибка'}`;
        }
      } catch (e) {
        inviteResult = '\n⚠️ Ошибка добавления в группу';
      }

      const accessEndStr = isJI
        ? `\n📅 Доступ до: *${accessEnd.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric' })}*`
        : '';

      const approvedCaption =
        `✅ *ОДОБРЕНО*\n\n` +
        `👤 Пользователь: *${userName}*\n` +
        `📦 Товар: *${productDisplayName}*\n` +
        `💰 Сумма: *${purchase.price} ₽*\n` +
        `🕐 Рассмотрено: ${now.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}` +
        accessEndStr + tokenResult + inviteResult;

      // Редактируем сообщение у всех админов
      for (const aid of adminIds) {
        if (messageId && aid) {
          await editMessageCaption(aid, parseInt(messageId), approvedCaption);
        }
      }

      console.log('[approve-purchase] Approved:', purchaseId);
      return htmlResponse(`✅ Заявка одобрена!\n\n${productDisplayName}\nПользователь: ${userName}${inviteResult}`);

    } else if (action === 'no' || action === 'ji_no') {
      await supabase.from(tableName).update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      }).eq('id', purchaseId);

      const rejectedCaption =
        `❌ *ОТКЛОНЕНО*\n\n` +
        `👤 Пользователь: *${userName}*\n` +
        `📦 Товар: *${productDisplayName}*\n` +
        `💰 Сумма: *${purchase.price} ₽*\n` +
        `🕐 Рассмотрено: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;

      for (const aid of adminIds) {
        if (messageId && aid) {
          await editMessageCaption(aid, parseInt(messageId), rejectedCaption);
        }
      }

      console.log('[approve-purchase] Rejected:', purchaseId);
      return htmlResponse(`❌ Заявка отклонена\n\n${productDisplayName}\nПользователь: ${userName}`);

    } else if (action === 'bl') {
      const blockProfileId = profileId || purchase.profile_id;

      await supabase.from('profiles').update({
        is_blocked: true,
        block_reason: 'Заблокирован администратором',
      }).eq('id', blockProfileId);

      await supabase.from(tableName).update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      }).eq('id', purchaseId);

      const blockedCaption =
        `🚫 *ЗАБЛОКИРОВАН*\n\n` +
        `👤 Пользователь: *${userName}*\n` +
        `📱 Telegram ID: \`${userTelegramId}\`\n` +
        `📦 Товар: *${productDisplayName}*\n` +
        `🕐 Заблокирован: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`;

      for (const aid of adminIds) {
        if (messageId && aid) {
          await editMessageCaption(aid, parseInt(messageId), blockedCaption);
        }
      }

      console.log('[approve-purchase] Blocked profile:', blockProfileId);
      return htmlResponse(`🚫 Профиль заблокирован\n\nПользователь: ${userName}\nID: ${userTelegramId}`);
    }

    return new Response('Unknown action', { status: 400, headers: corsHeaders });

  } catch (e) {
    console.error('[approve-purchase] Error:', e);
    return htmlResponse('❌ Ошибка сервера: ' + String(e));
  }
});

function htmlResponse(message: string) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Apex Technology</title>
  <style>
    body { background: #0a0a0a; color: #fff; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #111; border: 1px solid #222; border-radius: 20px; padding: 32px; max-width: 400px; text-align: center; }
    pre { white-space: pre-wrap; font-family: inherit; font-size: 16px; line-height: 1.6; margin: 0; }
    .close { margin-top: 20px; color: #666; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <pre>${message}</pre>
    <p class="close">Можно закрыть эту страницу</p>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });
}
