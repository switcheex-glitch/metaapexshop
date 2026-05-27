// ============================================================
// invite-to-group — выдаёт инвайт-ссылку в Telegram канал товара
// Использует ADMIN_BOT_TOKEN (бот должен быть админом каналов)
// ============================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Маппинг product_id → постоянная инвайт-ссылка на Telegram-канал
const PRODUCT_INVITE_LINKS: Record<string, { link: string; name: string }> = {
  'jarvis-hud': { link: 'https://t.me/+MMjlEfT8lmhjYzcy', name: 'Jarvis' },
  'ghost-gpt':  { link: 'https://t.me/+iE7VEND9CcZkNjVh', name: 'Ghost GPT' },
  'metacore':   { link: 'https://t.me/+EcQoIfUg8r1lZjdi', name: 'Metacore' },
};

// Маппинг по названию продукта
const PRODUCT_NAME_MAP: Record<string, string> = {
  'jarvis':    'jarvis-hud',
  'ghost gpt': 'ghost-gpt',
  'ghostgpt':  'ghost-gpt',
  'metacore':  'metacore',
};

function resolveProductKey(productId: string, productName: string): string | null {
  if (productId && PRODUCT_INVITE_LINKS[productId]) return productId;
  const byName = PRODUCT_NAME_MAP[(productName || '').toLowerCase()];
  if (byName) return byName;
  const nameLower = (productName || '').toLowerCase();
  for (const [k, v] of Object.entries(PRODUCT_NAME_MAP)) {
    if (nameLower.includes(k)) return v;
  }
  return null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { purchaseId } = await req.json();
    if (!purchaseId) return json({ error: 'purchaseId required' }, 400);

    // Достаём покупку
    const { data: purchase, error: pErr } = await supabase
      .from('purchases')
      .select('*')
      .eq('id', purchaseId)
      .single();

    if (pErr || !purchase) return json({ error: 'Purchase not found' }, 404);

    // Только approved покупки
    if (purchase.status !== 'approved') {
      return json({ error: 'Покупка ещё не подтверждена' }, 400);
    }

    const resolvedKey = resolveProductKey(purchase.product_id, purchase.product_name);
    if (!resolvedKey) {
      return json({ error: `Неизвестный продукт: ${purchase.product_name}` }, 400);
    }

    const group = PRODUCT_INVITE_LINKS[resolvedKey];

    if (!group.link) {
      return json({ error: `Ссылка-приглашение для "${group.name}" ещё не настроена` }, 400);
    }

    // Сохраняем выданную ссылку в БД
    await supabase.from('purchases')
      .update({ invite_link: group.link, invited_at: new Date().toISOString() })
      .eq('id', purchaseId);

    return json({
      success: true,
      invite_link: group.link,
      group: group.name,
    });

  } catch (error) {
    console.error('[invite-to-group] Error:', error);
    return json({ error: String(error) }, 500);
  }
});
