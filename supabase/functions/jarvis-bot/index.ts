import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BOT_TOKEN = Deno.env.get('JARVIS_TOKEN_BOT_TOKEN')!;
const BOT_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const MINI_APP_URL = 'https://testzbt2.vercel.app/miniapp';

const TIER_INFO: Record<string, { name: string; tokens: number; color: string; emoji: string; bar: string }> = {
  mk1: { name: 'MK-I',   tokens: 10000, color: '🔵', emoji: '⚡', bar: '▓▓▓░░░░░░░' },
  mk2: { name: 'MK-II',  tokens: 30000, color: '🟢', emoji: '⚡⚡', bar: '▓▓▓▓▓▓░░░░' },
  mk3: { name: 'MK-III', tokens: 60000, color: '🔴', emoji: '⚡⚡⚡', bar: '▓▓▓▓▓▓▓▓▓▓' },
};

// Генерация красивого токена в стиле JARVIS
function generateToken(tier: string): string {
  const prefix = `JRV-${tier.toUpperCase()}`;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments = [];
  for (let s = 0; s < 3; s++) {
    let seg = '';
    for (let i = 0; i < 5; i++) {
      seg += chars[Math.floor(Math.random() * chars.length)];
    }
    segments.push(seg);
  }
  return `${prefix}-${segments.join('-')}`;
}

// Отправить сообщение
async function sendMessage(chatId: number | string, text: string, replyMarkup?: object) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(`${BOT_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Редактировать сообщение
async function editMessage(chatId: number | string, messageId: number, text: string, replyMarkup?: object) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(`${BOT_API}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Ответить на callback
async function answerCallback(id: string, text?: string) {
  await fetch(`${BOT_API}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: id, text: text || '' }),
  });
}

// HUD-стиль: главное меню
function buildMainMenu(username: string): string {
  return (
    `<b>╔══════════════════════════╗</b>\n` +
    `<b>║  ⚙️  J.A.R.V.I.S  SYSTEM  ║</b>\n` +
    `<b>╚══════════════════════════╝</b>\n\n` +
    `<b>APEX TECHNOLOGY</b> · Access Portal\n\n` +
    `▸ Пользователь: <code>${username}</code>\n` +
    `▸ Статус: <b>ONLINE</b> ✅\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Выберите действие:`
  );
}

// HUD: экран токена
function buildTokenScreen(
  tier: string,
  tierName: string,
  token: string,
  tokensCount: number,
  accessEnd: string | null,
  daysLeft: number | null
): string {
  const info = TIER_INFO[tier] || TIER_INFO.mk1;
  const endDate = accessEnd
    ? new Date(accessEnd).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Moscow' })
    : '—';
  const endTime = accessEnd
    ? new Date(accessEnd).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' })
    : '';

  const daysStr = daysLeft !== null
    ? daysLeft <= 0
      ? '❌ ИСТЁК'
      : daysLeft <= 3
      ? `⚠️ ${daysLeft} дн. (скоро истекает!)`
      : `✅ ${daysLeft} дн.`
    : '—';

  return (
    `<b>╔══════════════════════════╗</b>\n` +
    `<b>║  🔑  ACCESS TOKEN ISSUED  ║</b>\n` +
    `<b>╚══════════════════════════╝</b>\n\n` +
    `<b>ТАРИФ:</b> ${info.color} <b>Jarvis Industries ${tierName}</b>\n` +
    `<b>УРОВЕНЬ:</b> ${info.emoji} ${info.bar}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<b>🔐 ВАШ ТОКЕН ДОСТУПА:</b>\n\n` +
    `<code>${token}</code>\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<b>⚡ ТОКЕНЫ:</b> <code>${tokensCount.toLocaleString('ru-RU')}</code>\n` +
    `<b>📅 ДОСТУП ДО:</b> ${endDate} ${endTime} МСК\n` +
    `<b>⏳ ОСТАЛОСЬ:</b> ${daysStr}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>Скопируйте токен и введите его при запуске приложения Jarvis Industries.</i>\n\n` +
    `<b>⚠️ Не передавайте токен третьим лицам!</b>`
  );
}

// HUD: нет подписки
function buildNoAccessScreen(): string {
  return (
    `<b>╔══════════════════════════╗</b>\n` +
    `<b>║  🚫  ACCESS DENIED        ║</b>\n` +
    `<b>╚══════════════════════════╝</b>\n\n` +
    `<b>СИСТЕМА:</b> Активная подписка не найдена\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Для получения токена необходимо приобрести один из тарифов:\n\n` +
    `🔵 <b>MK-I</b>   — 10 000 токенов\n` +
    `🟢 <b>MK-II</b>  — 30 000 токенов\n` +
    `🔴 <b>MK-III</b> — 60 000 токенов\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Перейдите в магазин: <b>@ApexTechnology_bot</b>`
  );
}

// HUD: выбор тарифа (если несколько)
function buildSelectTierScreen(tiers: { tier: string; tierName: string; daysLeft: number | null }[]): string {
  const lines = tiers.map(t => {
    const info = TIER_INFO[t.tier] || TIER_INFO.mk1;
    const days = t.daysLeft !== null
      ? t.daysLeft <= 0 ? '❌ истёк' : `${t.daysLeft} дн.`
      : '—';
    return `${info.color} <b>${t.tierName}</b> — ${days}`;
  });

  return (
    `<b>╔══════════════════════════╗</b>\n` +
    `<b>║  📋  SELECT TIER          ║</b>\n` +
    `<b>╚══════════════════════════╝</b>\n\n` +
    `Обнаружено несколько активных подписок:\n\n` +
    lines.join('\n') + '\n\n' +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Выберите тариф для получения токена:`
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    console.log('[jarvis-bot] Update:', JSON.stringify(body).substring(0, 300));

    const message = body.message;
    const callbackQuery = body.callback_query;

    // ── ОБРАБОТКА СООБЩЕНИЙ ──────────────────────────────────────────────
    if (message) {
      const chatId = message.chat.id;
      const userId = message.from?.id;
      const username = message.from?.username || message.from?.first_name || String(userId);
      const text = message.text || '';

      console.log(`[jarvis-bot] Message from ${userId} (@${username}): ${text}`);

      // При /start и любом сообщении — только кнопка открытия Mini App
      if (text === '/start' || text.startsWith('/start ') || text) {
        await sendMessage(chatId,
          `⚡ <b>Jarvis Industries</b>\n\nНажмите кнопку ниже чтобы открыть панель управления:`,
          {
            inline_keyboard: [
              [{ text: '🚀 Открыть JARVIS HUD', web_app: { url: MINI_APP_URL } }],
            ],
          }
        );
        return new Response('ok', { status: 200 });
      }
    }

    // ── ОБРАБОТКА CALLBACK ───────────────────────────────────────────────
    if (callbackQuery) {
      const chatId = callbackQuery.message?.chat?.id;
      const messageId = callbackQuery.message?.message_id;
      const userId = callbackQuery.from?.id;
      const username = callbackQuery.from?.username || callbackQuery.from?.first_name || String(userId);
      const data = callbackQuery.data as string;

      await answerCallback(callbackQuery.id);

      console.log(`[jarvis-bot] Callback from ${userId} (@${username}): ${data}`);

      // Ищем профиль по Telegram ID
      const telegramIdStr = `@id_${userId}`;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, telegram_id, is_blocked')
        .eq('telegram_id', telegramIdStr)
        .single();

      // ── GET TOKEN ──────────────────────────────────────────────────────
      if (data === 'get_token' || data === 'check_status') {
        if (!profile) {
          await editMessage(chatId, messageId,
            `<b>╔══════════════════════════╗</b>\n` +
            `<b>║  ⚠️  PROFILE NOT FOUND    ║</b>\n` +
            `<b>╚══════════════════════════╝</b>\n\n` +
            `Аккаунт не найден в системе.\n\n` +
            `Зарегистрируйтесь в магазине <b>Apex Technology</b> и укажите ваш Telegram ID при регистрации.\n\n` +
            `▸ Магазин: <b>@ApexTechnology_bot</b>`,
            { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'back_main' }]] }
          );
          return new Response('ok', { status: 200 });
        }

        if (profile.is_blocked) {
          await editMessage(chatId, messageId,
            `<b>╔══════════════════════════╗</b>\n` +
            `<b>║  🚫  ACCOUNT BLOCKED      ║</b>\n` +
            `<b>╚══════════════════════════╝</b>\n\n` +
            `Ваш аккаунт заблокирован.\n` +
            `Обратитесь в поддержку: <b>@vibetechhSupport</b>`,
            { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'back_main' }]] }
          );
          return new Response('ok', { status: 200 });
        }

        // Ищем активные подписки JI
        const { data: purchases } = await supabase
          .from('jarvis_industries_purchases')
          .select('*')
          .eq('profile_id', profile.id)
          .eq('status', 'approved')
          .order('purchased_at', { ascending: false });

        const activePurchases = (purchases || []).filter(p => {
          if (!p.access_end) return false;
          return new Date(p.access_end).getTime() > Date.now();
        });

        if (activePurchases.length === 0) {
          await editMessage(chatId, messageId, buildNoAccessScreen(), {
            inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'back_main' }]],
          });
          return new Response('ok', { status: 200 });
        }

        // Если одна подписка — сразу выдаём токен
        if (activePurchases.length === 1) {
          const purchase = activePurchases[0];
          const daysLeft = Math.ceil((new Date(purchase.access_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          if (data === 'check_status') {
            // Только статус — без выдачи токена
            const info = TIER_INFO[purchase.tier] || TIER_INFO.mk1;
            const endDate = new Date(purchase.access_end).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Moscow' });
            const endTime = new Date(purchase.access_end).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' });

            await editMessage(chatId, messageId,
              `<b>╔══════════════════════════╗</b>\n` +
              `<b>║  📊  SUBSCRIPTION STATUS  ║</b>\n` +
              `<b>╚══════════════════════════╝</b>\n\n` +
              `<b>ТАРИФ:</b> ${info.color} <b>Jarvis Industries ${purchase.tier_name}</b>\n` +
              `<b>УРОВЕНЬ:</b> ${info.emoji} ${info.bar}\n\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `<b>⚡ ТОКЕНЫ:</b> <code>${purchase.tokens.toLocaleString('ru-RU')}</code>\n` +
              `<b>📅 ДОСТУП ДО:</b> ${endDate} ${endTime} МСК\n` +
              `<b>⏳ ОСТАЛОСЬ:</b> ${daysLeft <= 3 ? `⚠️ ${daysLeft} дн.` : `✅ ${daysLeft} дн.`}\n\n` +
              `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
              `<b>СТАТУС:</b> 🟢 ACTIVE`,
              {
                inline_keyboard: [
                  [{ text: '🔑 Получить токен', callback_data: `issue_token:${purchase.id}` }],
                  [{ text: '🔙 Назад', callback_data: 'back_main' }],
                ],
              }
            );
            return new Response('ok', { status: 200 });
          }

          // Выдаём токен
          await issueToken(supabase, chatId, messageId, purchase, profile, daysLeft);

        } else {
          // Несколько подписок — предлагаем выбрать
          const tierList = activePurchases.map(p => ({
            tier: p.tier,
            tierName: p.tier_name,
            daysLeft: Math.ceil((new Date(p.access_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          }));

          const buttons = activePurchases.map(p => {
            const info = TIER_INFO[p.tier] || TIER_INFO.mk1;
            const days = Math.ceil((new Date(p.access_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return [{ text: `${info.color} ${p.tier_name} — ${days} дн.`, callback_data: `issue_token:${p.id}` }];
          });
          buttons.push([{ text: '🔙 Назад', callback_data: 'back_main' }]);

          await editMessage(chatId, messageId, buildSelectTierScreen(tierList), {
            inline_keyboard: buttons,
          });
        }
      }

      // ── REFRESH TOKEN ─────────────────────────────────────────────────
      if (data.startsWith('refresh_token:')) {
        const purchaseId = data.split(':')[1];

        const { data: purchase } = await supabase
          .from('jarvis_industries_purchases')
          .select('*')
          .eq('id', purchaseId)
          .single();

        if (!purchase || purchase.status !== 'approved') {
          await editMessage(chatId, messageId, buildNoAccessScreen(), {
            inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'back_main' }]],
          });
          return new Response('ok', { status: 200 });
        }

        // Деактивируем старый токен
        await supabase
          .from('jarvis_app_tokens')
          .update({ is_active: false })
          .eq('purchase_id', purchaseId);

        // Генерируем новый
        const newToken = generateToken(purchase.tier as string);
        await supabase.from('jarvis_app_tokens').insert({
          purchase_id: purchaseId,
          profile_id: profile?.id || null,
          token: newToken,
          tier: purchase.tier,
          tier_name: purchase.tier_name,
          tokens_count: purchase.tokens,
          telegram_id: purchase.telegram_id || profile?.telegram_id || null,
          username: purchase.username || profile?.username || null,
          issued_at: new Date().toISOString(),
          expires_at: purchase.access_end,
          is_active: true,
        });

        const daysLeft = purchase.access_end
          ? Math.ceil((new Date(purchase.access_end as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        console.log(`[jarvis-bot] Token refreshed for purchase ${purchaseId}: ${newToken}`);

        await editMessage(
          chatId,
          messageId,
          buildTokenScreen(purchase.tier as string, purchase.tier_name as string, newToken, purchase.tokens as number, purchase.access_end as string | null, daysLeft),
          {
            inline_keyboard: [
              [{ text: '🔄 Обновить токен', callback_data: `refresh_token:${purchaseId}` }],
              [{ text: '📊 Статус подписки', callback_data: 'check_status' }],
              [{ text: '🔙 Главное меню', callback_data: 'back_main' }],
            ],
          }
        );
      }

      // ── ISSUE TOKEN (конкретная покупка) ──────────────────────────────
      if (data.startsWith('issue_token:')) {
        const purchaseId = data.split(':')[1];

        const { data: purchase } = await supabase
          .from('jarvis_industries_purchases')
          .select('*')
          .eq('id', purchaseId)
          .single();

        if (!purchase || purchase.status !== 'approved') {
          await editMessage(chatId, messageId, buildNoAccessScreen(), {
            inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'back_main' }]],
          });
          return new Response('ok', { status: 200 });
        }

        const daysLeft = purchase.access_end
          ? Math.ceil((new Date(purchase.access_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        await issueToken(supabase, chatId, messageId, purchase, profile, daysLeft);
      }

      // ── HELP ──────────────────────────────────────────────────────────
      if (data === 'help') {
        await editMessage(chatId, messageId,
          `<b>╔══════════════════════════╗</b>\n` +
          `<b>║  ❓  HELP & SUPPORT       ║</b>\n` +
          `<b>╚══════════════════════════╝</b>\n\n` +
          `<b>Как получить токен:</b>\n` +
          `1. Купите тариф Jarvis Industries в магазине\n` +
          `2. Дождитесь одобрения оплаты\n` +
          `3. Нажмите «Получить токен доступа»\n` +
          `4. Введите токен при запуске приложения\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `<b>Тарифы:</b>\n` +
          `🔵 <b>MK-I</b>   — 10 000 токенов / 30 дней\n` +
          `🟢 <b>MK-II</b>  — 30 000 токенов / 30 дней\n` +
          `🔴 <b>MK-III</b> — 60 000 токенов / 30 дней\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `<b>Поддержка:</b> @vibetechhSupport\n` +
          `<b>Канал:</b> @ApexTechnology_bot`,
          { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'back_main' }]] }
        );
      }

      // ── BACK MAIN ─────────────────────────────────────────────────────
      if (data === 'back_main') {
        await editMessage(chatId, messageId, buildMainMenu(username), {
          inline_keyboard: [
            [{ text: '🚀 Открыть JARVIS HUD', web_app: { url: MINI_APP_URL } }],
            [{ text: '🔑 Получить токен', callback_data: 'get_token' }, { text: '📊 Статус', callback_data: 'check_status' }],
            [{ text: '❓ Помощь', callback_data: 'help' }],
          ],
        });
      }
    }

    return new Response('ok', { status: 200 });

  } catch (error) {
    console.error('[jarvis-bot] Error:', error);
    return new Response('ok', { status: 200 });
  }
});

// ── Выдача / обновление токена ─────────────────────────────────────────────
async function issueToken(
  supabase: ReturnType<typeof createClient>,
  chatId: number,
  messageId: number,
  purchase: Record<string, unknown>,
  profile: Record<string, unknown> | null,
  daysLeft: number | null
) {
  const purchaseId = purchase.id as string;
  const tier = purchase.tier as string;
  const tierName = purchase.tier_name as string;
  const tokensCount = purchase.tokens as number;
  const accessEnd = purchase.access_end as string | null;

  // Проверяем — есть ли уже активный токен для этой покупки
  const { data: existingToken } = await supabase
    .from('jarvis_app_tokens')
    .select('*')
    .eq('purchase_id', purchaseId)
    .eq('is_active', true)
    .single();

  let token: string;

  if (existingToken) {
    // Возвращаем существующий токен
    token = existingToken.token as string;
    console.log(`[jarvis-bot] Returning existing token for purchase ${purchaseId}`);

    // Обновляем last_used_at
    await supabase
      .from('jarvis_app_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', existingToken.id);
  } else {
    // Генерируем новый токен
    token = generateToken(tier);

    await supabase.from('jarvis_app_tokens').insert({
      purchase_id: purchaseId,
      profile_id: profile?.id || null,
      token,
      tier,
      tier_name: tierName,
      tokens_count: tokensCount,
      telegram_id: purchase.telegram_id || profile?.telegram_id || null,
      username: purchase.username || profile?.username || null,
      issued_at: new Date().toISOString(),
      expires_at: accessEnd,
      is_active: true,
    });

    console.log(`[jarvis-bot] New token issued for purchase ${purchaseId}: ${token}`);
  }

  await editMessage(
    chatId,
    messageId,
    buildTokenScreen(tier, tierName, token, tokensCount, accessEnd, daysLeft),
    {
      inline_keyboard: [
        [{ text: '🔄 Обновить токен', callback_data: `refresh_token:${purchaseId}` }],
        [{ text: '📊 Статус подписки', callback_data: 'check_status' }],
        [{ text: '🔙 Главное меню', callback_data: 'back_main' }],
      ],
    }
  );
}