import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Маппинг тарифа → бот + группа
const TIER_CONFIG: Record<string, { botToken: string; chatId: string; name: string }> = {
  mk1: {
    botToken: Deno.env.get('JI_MK1_BOT_TOKEN')!,
    chatId: '-1003743900341',
    name: 'Jarvis Industries MK-I',
  },
  mk2: {
    botToken: Deno.env.get('JI_MK2_BOT_TOKEN')!,
    chatId: '-1003794537001',
    name: 'Jarvis Industries MK-II',
  },
  mk3: {
    botToken: Deno.env.get('JI_MK3_BOT_TOKEN')!,
    chatId: '-1003876790984',
    name: 'Jarvis Industries MK-III',
  },
};

const ADMIN_BOT_TOKEN = Deno.env.get('ADMIN_BOT_TOKEN')!;

// Отправить сообщение пользователю через бот тарифа
async function sendUserMessage(botToken: string, userId: number, text: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: userId, text, parse_mode: 'Markdown' }),
    });
    const data = await res.json();
    console.log(`[check-subscriptions] sendMessage to ${userId}:`, data.ok, data.description || '');
    return data.ok;
  } catch (e) {
    console.error(`[check-subscriptions] sendMessage error:`, e);
    return false;
  }
}

// Кикнуть пользователя из группы
async function kickUser(botToken: string, chatId: string, userId: number): Promise<boolean> {
  try {
    // banChatMember — кик (потом сразу unban чтобы мог вернуться при продлении)
    const banRes = await fetch(`https://api.telegram.org/bot${botToken}/banChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        user_id: userId,
        revoke_messages: false,
      }),
    });
    const banData = await banRes.json();
    console.log(`[check-subscriptions] banChatMember ${userId} from ${chatId}:`, banData.ok, banData.description || '');

    if (banData.ok) {
      // Сразу снимаем бан — чтобы при продлении мог войти по новой ссылке
      await fetch(`https://api.telegram.org/bot${botToken}/unbanChatMember`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, user_id: userId, only_if_banned: true }),
      });
    }

    return banData.ok;
  } catch (e) {
    console.error(`[check-subscriptions] kickUser error:`, e);
    return false;
  }
}

// Уведомить администратора
async function notifyAdmin(adminChatId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: adminChatId, text, parse_mode: 'Markdown' }),
    });
  } catch (e) {
    console.error(`[check-subscriptions] notifyAdmin error:`, e);
  }
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
    const now = new Date();

    console.log(`[check-subscriptions] Starting check at ${now.toISOString()}`);

    // Получаем все одобренные активные подписки
    const { data: purchases, error } = await supabase
      .from('jarvis_industries_purchases')
      .select('*, profiles(telegram_id, username)')
      .eq('status', 'approved')
      .not('access_end', 'is', null)
      .not('invited_to_group', 'is', null);

    if (error) {
      console.error('[check-subscriptions] DB error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[check-subscriptions] Found ${purchases?.length || 0} active subscriptions`);

    const results = {
      kicked: [] as string[],
      warned_3days: [] as string[],
      warned_1day: [] as string[],
      already_expired: [] as string[],
      errors: [] as string[],
    };

    for (const purchase of (purchases || [])) {
      const tier = purchase.tier as string;
      const config = TIER_CONFIG[tier];
      if (!config) {
        console.warn(`[check-subscriptions] Unknown tier: ${tier}`);
        continue;
      }

      const profile = purchase.profiles as { telegram_id: string; username: string } | null;
      const telegramIdStr = profile?.telegram_id || purchase.telegram_id || '';
      const username = profile?.username || purchase.username || 'Пользователь';

      // Извлекаем числовой Telegram ID
      let telegramUserId: number | null = null;
      if (telegramIdStr.startsWith('@id_')) {
        telegramUserId = parseInt(telegramIdStr.replace('@id_', ''), 10);
      }

      if (!telegramUserId || isNaN(telegramUserId)) {
        console.warn(`[check-subscriptions] No valid telegram ID for purchase ${purchase.id}`);
        continue;
      }

      const accessEnd = new Date(purchase.access_end);
      const diffMs = accessEnd.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      const diffHours = diffMs / (1000 * 60 * 60);

      const accessEndFormatted = accessEnd.toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        timeZone: 'Europe/Moscow',
      });
      const accessEndTime = accessEnd.toLocaleTimeString('ru-RU', {
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Moscow',
      });

      // ── ПОДПИСКА ИСТЕКЛА ──────────────────────────────────────────────────
      if (diffMs <= 0) {
        // Уже помечена как истёкшая — пропускаем
        if (purchase.status === 'expired') {
          results.already_expired.push(purchase.id);
          continue;
        }

        console.log(`[check-subscriptions] EXPIRED: ${username} (${tier}) — kicking from ${config.chatId}`);

        // Кикаем из группы
        const kicked = await kickUser(config.botToken, config.chatId, telegramUserId);

        // Обновляем статус в БД
        await supabase
          .from('jarvis_industries_purchases')
          .update({ status: 'expired' })
          .eq('id', purchase.id);

        if (kicked) {
          results.kicked.push(`${username} (${tier})`);

          // Уведомляем пользователя
          await sendUserMessage(
            config.botToken,
            telegramUserId,
            `⏰ *Ваша подписка на ${config.name} истекла*\n\n` +
            `Срок действия закончился ${accessEndFormatted} в ${accessEndTime} МСК.\n\n` +
            `Вы были удалены из закрытой группы.\n\n` +
            `Для продления подписки перейдите в наш магазин: @ApexTechhh`
          );
        } else {
          results.errors.push(`Не удалось кикнуть ${username} (${tier})`);
        }

        // Уведомляем администратора
        if (ADMIN_CHAT_ID) {
          for (const adminId of ADMIN_CHAT_ID.split(',').map(s => s.trim()).filter(Boolean)) {
            await notifyAdmin(
              adminId,
              `🔴 *Подписка истекла*\n\n` +
              `👤 ${username} (${telegramIdStr})\n` +
              `📦 ${config.name}\n` +
              `${kicked ? '✅ Кикнут из группы' : '⚠️ Не удалось кикнуть'}`
            );
          }
        }

      // ── ПРЕДУПРЕЖДЕНИЕ ЗА 1 ДЕНЬ ─────────────────────────────────────────
      } else if (diffHours <= 24 && !purchase.warned_1day) {
        console.log(`[check-subscriptions] WARNING 1 DAY: ${username} (${tier})`);

        await sendUserMessage(
          config.botToken,
          telegramUserId,
          `⚠️ *Внимание! Подписка заканчивается через 24 часа*\n\n` +
          `📦 ${config.name}\n` +
          `📅 Истекает: *${accessEndFormatted}* в *${accessEndTime}* МСК\n\n` +
          `Успейте продлить подписку в нашем магазине: @ApexTechhh\n` +
          `После истечения вы будете удалены из группы.`
        );

        await supabase
          .from('jarvis_industries_purchases')
          .update({ warned_1day: true })
          .eq('id', purchase.id);

        results.warned_1day.push(`${username} (${tier})`);

      // ── ПРЕДУПРЕЖДЕНИЕ ЗА 3 ДНЯ ─────────────────────────────────────────
      } else if (diffDays <= 3 && diffDays > 1 && !purchase.warned_3days) {
        console.log(`[check-subscriptions] WARNING 3 DAYS: ${username} (${tier})`);

        const daysLeft = Math.ceil(diffDays);

        await sendUserMessage(
          config.botToken,
          telegramUserId,
          `🔔 *Напоминание о подписке*\n\n` +
          `📦 ${config.name}\n` +
          `⏳ До окончания: *${daysLeft} ${daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}*\n` +
          `📅 Истекает: *${accessEndFormatted}* в *${accessEndTime}* МСК\n\n` +
          `Продлите подписку заранее в нашем магазине: @ApexTechhh`
        );

        await supabase
          .from('jarvis_industries_purchases')
          .update({ warned_3days: true })
          .eq('id', purchase.id);

        results.warned_3days.push(`${username} (${tier})`);
      }
    }

    const summary = {
      checked: purchases?.length || 0,
      kicked: results.kicked.length,
      warned_3days: results.warned_3days.length,
      warned_1day: results.warned_1day.length,
      errors: results.errors.length,
      details: results,
    };

    console.log('[check-subscriptions] Done:', JSON.stringify(summary));

    return new Response(JSON.stringify({ success: true, ...summary }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[check-subscriptions] Fatal error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
