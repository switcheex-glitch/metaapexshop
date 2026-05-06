// ============================================================
// invite-to-group (Metacore project)
// Проект: nsrilzwmclsiwtrsomer
// ============================================================
// Принимает { purchaseId } и отдаёт статичную ссылку-приглашение
// в Telegram-канал Metacore. Никаких ботов, никаких добавлений.
// Просто фиксируем сам факт получения ссылки в БД.
// ============================================================

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const METACORE_INVITE_LINK = 'https://t.me/+c8I7o-ZGgHBiZDAy';
const METACORE_NAME        = 'Metacore';

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
    if (!purchaseId) return json({ error: 'purchaseId обязателен' }, 400);

    const { data: purchase, error } = await supabase
      .from('metacore_purchases')
      .select('*')
      .eq('id', purchaseId)
      .single();

    if (error || !purchase) return json({ error: 'Покупка не найдена' }, 404);
    if (purchase.status !== 'approved') {
      return json({ error: 'Оплата ещё не подтверждена' }, 400);
    }

    // Сохраняем факт получения ссылки (если ещё не сохранён)
    if (!purchase.invited_to_group) {
      await supabase.from('metacore_purchases')
        .update({
          invited_to_group: true,
          invited_at:       new Date().toISOString(),
          invite_link:      METACORE_INVITE_LINK,
        })
        .eq('id', purchaseId);
    }

    return json({
      success:        true,
      added_directly: false,
      invite_link:    METACORE_INVITE_LINK,
      group:          METACORE_NAME,
    });

  } catch (e) {
    console.error('[invite-to-group] error', e);
    return json({ error: String(e) }, 500);
  }
});
