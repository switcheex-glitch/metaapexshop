import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const INVITE_BOT_TOKEN = Deno.env.get('INVITE_BOT_TOKEN')!;

// Маппинг product_id → chat_id группы + бот токен
const PRODUCT_GROUPS: Record<string, { chatId: string; name: string; botToken?: string }> = {
  'jarvis_max':  { chatId: '-1002564995824', name: 'Jarvis Max' },
  'jarvis_pro':  { chatId: '-1002035910246', name: 'Jarvis Pro' },
  'friday_pro':  { chatId: '-1001816037231', name: 'Friday Pro' },
  'vibewall':    { chatId: '-1002277771896', name: 'VibeWall' },
  'pccontrol':   { chatId: '-1002268406304', name: 'PcControl' },
  // Jarvis Industries тарифы — каждый со своим ботом
  'jarvis_industries_mk1': { chatId: '-1003743900341', name: 'Jarvis Industries MK-I',   botToken: Deno.env.get('JI_MK1_BOT_TOKEN')! },
  'jarvis_industries_mk2': { chatId: '-1003794537001', name: 'Jarvis Industries MK-II',  botToken: Deno.env.get('JI_MK2_BOT_TOKEN')! },
  'jarvis_industries_mk3': { chatId: '-1003876790984', name: 'Jarvis Industries MK-III', botToken: Deno.env.get('JI_MK3_BOT_TOKEN')! },
};

// Также маппинг по названию продукта (на случай если product_id не совпадает)
const PRODUCT_NAME_MAP: Record<string, string> = {
  'jarvis max':  'jarvis_max',
  'jarvis pro':  'jarvis_pro',
  'friday pro':  'friday_pro',
  'vibewall':    'vibewall',
  'vibe wall':   'vibewall',
  'pccontrol':   'pccontrol',
  'pc control':  'pccontrol',
};

function resolveProductKey(productId: string, productName: string): string | null {
  // Сначала пробуем по product_id
  const byId = productId?.toLowerCase().replace(/\s+/g, '_');
  if (PRODUCT_GROUPS[byId]) return byId;

  // Потом по названию
  const byName = PRODUCT_NAME_MAP[productName?.toLowerCase()];
  if (byName) return byName;

  // Пробуем частичное совпадение по названию
  const nameLower = productName?.toLowerCase() || '';
  for (const [key, val] of Object.entries(PRODUCT_NAME_MAP)) {
    if (nameLower.includes(key) || key.includes(nameLower)) return val;
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { purchaseId, isJarvisIndustries } = await req.json();

    if (!purchaseId) {
      return new Response(JSON.stringify({ error: 'purchaseId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("[invite-to-group] Processing purchaseId:", purchaseId, "isJI:", isJarvisIndustries);

    // Ищем в нужной таблице
    let telegramIdStr = '';
    let productKey = '';
    let purchaseDbId = purchaseId;

    if (isJarvisIndustries) {
      const { data: jiPurchase, error: jiError } = await supabase
        .from('jarvis_industries_purchases')
        .select('*, profiles(telegram_id, username)')
        .eq('id', purchaseId)
        .single();

      if (jiError || !jiPurchase) {
        console.error("[invite-to-group] JI Purchase not found:", jiError);
        return new Response(JSON.stringify({ error: 'Purchase not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const profile = jiPurchase.profiles as { telegram_id: string } | null;
      telegramIdStr = profile?.telegram_id || jiPurchase.telegram_id || '';
      productKey = `jarvis_industries_${jiPurchase.tier}`;

      if (!PRODUCT_GROUPS[productKey]) {
        return new Response(JSON.stringify({ error: `Неизвестный тариф: ${jiPurchase.tier}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const group = PRODUCT_GROUPS[productKey];
      const botToken = group.botToken || INVITE_BOT_TOKEN;
      let telegramUserId: number | null = null;
      if (telegramIdStr.startsWith('@id_')) {
        telegramUserId = parseInt(telegramIdStr.replace('@id_', ''), 10);
      }

      console.log("[invite-to-group] JI Group:", group.name, group.chatId, "| User ID:", telegramUserId);

      if (telegramUserId && !isNaN(telegramUserId)) {
        await fetch(`https://api.telegram.org/bot${botToken}/unbanChatMember`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: group.chatId, user_id: telegramUserId, only_if_banned: true }),
        });

        const addRes = await fetch(`https://api.telegram.org/bot${botToken}/addChatMember`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: group.chatId, user_id: telegramUserId }),
        });
        const addData = await addRes.json();
        console.log("[invite-to-group] JI addChatMember result:", addData);

        if (addData.ok) {
          await supabase.from('jarvis_industries_purchases')
            .update({ invited_to_group: true, invited_at: new Date().toISOString() })
            .eq('id', purchaseId);

          return new Response(JSON.stringify({
            success: true, added_directly: true, group: group.name,
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // Создаём invite link для JI
      const linkRes = await fetch(`https://api.telegram.org/bot${botToken}/createChatInviteLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: group.chatId,
          member_limit: 1,
          expire_date: Math.floor(Date.now() / 1000) + 86400 * 30, // 30 дней
        }),
      });
      const linkData = await linkRes.json();
      console.log("[invite-to-group] JI createChatInviteLink result:", linkData);

      if (linkData.ok) {
        await supabase.from('jarvis_industries_purchases')
          .update({ invite_link: linkData.result.invite_link })
          .eq('id', purchaseId);

        return new Response(JSON.stringify({
          success: true,
          added_directly: false,
          invite_link: linkData.result.invite_link,
          group: group.name,
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.error("[invite-to-group] JI Bot is not admin:", group.chatId, linkData);
      return new Response(JSON.stringify({
        error: `Бот не является администратором группы ${group.name}. Обратитесь в поддержку: @vibetechhSupport`,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } else {
      // Обычная покупка — старая логика
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .select('*, profiles(telegram_id, username)')
        .eq('id', purchaseId)
        .single();

      if (purchaseError || !purchase) {
        console.error("[invite-to-group] Purchase not found:", purchaseError);
        return new Response(JSON.stringify({ error: 'Purchase not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const profile = purchase.profiles as { telegram_id: string; username: string } | null;
      if (!profile) {
        return new Response(JSON.stringify({ error: 'Profile not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      telegramIdStr = profile.telegram_id;
      let telegramUserId: number | null = null;
      if (telegramIdStr.startsWith('@id_')) {
        telegramUserId = parseInt(telegramIdStr.replace('@id_', ''), 10);
      }

      const resolvedKey = resolveProductKey(purchase.product_id, purchase.product_name);
      if (!resolvedKey) {
        console.error("[invite-to-group] Unknown product:", purchase.product_id, purchase.product_name);
        return new Response(JSON.stringify({ error: `Неизвестный продукт: ${purchase.product_name}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const group = PRODUCT_GROUPS[resolvedKey];
      const botToken = group.botToken || INVITE_BOT_TOKEN;
      console.log("[invite-to-group] Group:", group.name, group.chatId, "| User ID:", telegramUserId, "| Bot:", botToken.split(':')[0]);

      if (telegramUserId && !isNaN(telegramUserId)) {
        await fetch(`https://api.telegram.org/bot${botToken}/unbanChatMember`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: group.chatId, user_id: telegramUserId, only_if_banned: true }),
        });

        const addRes = await fetch(`https://api.telegram.org/bot${botToken}/addChatMember`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: group.chatId, user_id: telegramUserId }),
        });
        const addData = await addRes.json();
        console.log("[invite-to-group] addChatMember result:", addData);

        if (addData.ok) {
          await supabase.from('purchases')
            .update({ invited_to_group: true, invited_at: new Date().toISOString() })
            .eq('id', purchaseId);

          return new Response(JSON.stringify({
            success: true, added_directly: true, group: group.name,
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.warn("[invite-to-group] addChatMember failed:", addData.description, "— trying invite link");
      }

      const linkRes = await fetch(`https://api.telegram.org/bot${botToken}/createChatInviteLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: group.chatId,
          member_limit: 1,
          expire_date: Math.floor(Date.now() / 1000) + 86400,
        }),
      });
      const linkData = await linkRes.json();
      console.log("[invite-to-group] createChatInviteLink result:", linkData);

      if (linkData.ok) {
        await supabase.from('purchases')
          .update({ invite_link: linkData.result.invite_link })
          .eq('id', purchaseId);

        return new Response(JSON.stringify({
          success: true,
          added_directly: false,
          invite_link: linkData.result.invite_link,
          group: group.name,
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      console.error("[invite-to-group] Bot is not admin in group:", group.chatId, linkData);
      return new Response(JSON.stringify({
        error: `Бот не является администратором группы ${group.name}. Обратитесь в поддержку: @vibetechhSupport`,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

  } catch (error) {
    console.error("[invite-to-group] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});