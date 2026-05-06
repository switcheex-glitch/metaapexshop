// ============================================================
// activate-key (Metacore project)
// Проект: nsrilzwmclsiwtrsomer
// ============================================================
// Десктопное приложение зовёт это POST { key, device_id, ip? }.
// Логика:
//   - Ключ не найден → 404
//   - Ключ ещё не выдан (is_used=false) → 400
//   - Ключ привязан к другому device_id → 403
//   - Ключ свободен ИЛИ совпадает с текущим device_id → 200, успех
// ============================================================

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    const body = await req.json().catch(() => ({}));
    const key       = (body.key       || '').toString().trim();
    const deviceId  = (body.device_id || body.deviceId || '').toString().trim();
    const clientIp  = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
                       || body.ip || null;

    if (!key)      return json({ ok: false, error: 'key обязателен' }, 400);
    if (!deviceId) return json({ ok: false, error: 'device_id обязателен' }, 400);

    const { data: keyRow, error: findErr } = await supabase
      .from('metacore_license_keys')
      .select('*')
      .eq('key', key)
      .maybeSingle();

    if (findErr) {
      console.error('[activate-key] find error', findErr);
      return json({ ok: false, error: 'Ошибка БД' }, 500);
    }
    if (!keyRow) return json({ ok: false, error: 'Ключ не найден' }, 404);

    // Ключ ещё не выдан после оплаты — значит фейк или украден из БД
    if (!keyRow.is_used) {
      return json({ ok: false, error: 'Ключ не выдан после оплаты' }, 400);
    }

    // Уже активирован
    if (keyRow.device_fingerprint) {
      if (keyRow.device_fingerprint === deviceId) {
        return json({
          ok: true,
          message: 'Уже активирован на этом устройстве',
          activated_at: keyRow.activated_at,
          purchase_id: keyRow.used_by_purchase_id,
        });
      }
      return json({
        ok: false,
        error: 'Ключ уже активирован на другом устройстве',
        activated_at: keyRow.activated_at,
      }, 403);
    }

    // Первая активация — фиксируем устройство.
    // Условие .is('device_fingerprint', null) делает UPDATE атомарным —
    // если кто-то успел раньше, мы получим 0 affected rows.
    const now = new Date().toISOString();
    const { data: updated, error: updErr } = await supabase
      .from('metacore_license_keys')
      .update({
        device_fingerprint: deviceId,
        activated_at:       now,
        activated_ip:       clientIp,
      })
      .eq('id', keyRow.id)
      .is('device_fingerprint', null)
      .select('id, device_fingerprint, activated_at');

    if (updErr) {
      console.error('[activate-key] update error', updErr);
      return json({ ok: false, error: 'Не удалось активировать' }, 500);
    }

    // Race lost — другой ПК успел активировать в этот же момент.
    if (!updated || updated.length === 0) {
      const { data: fresh } = await supabase
        .from('metacore_license_keys')
        .select('device_fingerprint, activated_at')
        .eq('id', keyRow.id)
        .maybeSingle();
      return json({
        ok: false,
        error: 'Ключ только что активирован на другом устройстве',
        activated_at: fresh?.activated_at ?? null,
      }, 403);
    }

    return json({
      ok: true,
      message: 'Ключ успешно активирован',
      activated_at: now,
      purchase_id: keyRow.used_by_purchase_id,
    });

  } catch (e) {
    console.error('[activate-key] error', e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
