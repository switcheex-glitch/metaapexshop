// ============================================================
// platega-webhook — унифицированный вебхук для оплаты товаров через Platega
//   1) { action: 'create' }  — создаёт платёж в Platega + pending-запись
//   2) { action: 'check'  }  — проверяет статус платежа
//   3) Колбэк от Platega     — переводит запись в approved/rejected
// ============================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-merchantid, x-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PAYMENT_METHOD_MAP: Record<string, number> = {
  sbp:    2,
  crypto: 13,
};

const METHOD_LABELS: Record<string, string> = {
  sbp:    'СБП',
  crypto: 'Криптовалюта',
};

const PLATEGA_API = 'https://app.platega.io/transaction/process';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function notifyAdmins(text: string) {
  const ADMIN_BOT_TOKEN = Deno.env.get('ADMIN_BOT_TOKEN') || '';
  const ADMIN_CHAT_IDS = (Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (!ADMIN_BOT_TOKEN || ADMIN_CHAT_IDS.length === 0) return;
  for (const id of ADMIN_CHAT_IDS) {
    try {
      await fetch(`https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: id, text, parse_mode: 'HTML' }),
      });
    } catch (e) {
      console.error('[platega-webhook] notifyAdmins error:', e);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const PLATEGA_MERCHANT_ID       = Deno.env.get('PLATEGA_MERCHANT_ID') || '';
  const PLATEGA_SECRET            = Deno.env.get('PLATEGA_SECRET') || '';
  const RETURN_URL                = Deno.env.get('RETURN_URL') || 'https://testzbt9.vercel.app/profile';
  const FAILED_URL                = Deno.env.get('FAILED_URL') || 'https://testzbt9.vercel.app/';

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  console.log('[platega-webhook] incoming:', JSON.stringify(body).slice(0, 800));

  // ====== 0) TEST — тестовое уведомление в Telegram ======
  if (body.action === 'test_notify') {
    await notifyAdmins(
      `🧪 <b>ТЕСТ — оплата подтверждена (Platega)</b>\n\n` +
      `👤 ${body.username || '@test_user'}\n` +
      `📱 ${body.telegramId || '@id_123456789'}\n` +
      `📦 ${body.productName || 'Ghost GPT'}\n` +
      `💰 ${body.price || '3900'} руб\n` +
      `💳 ${body.paymentMethod || 'СБП'}\n\n` +
      `🆔 <code>test-purchase-${Date.now()}</code>\n` +
      `🔗 tx: <code>test-tx-${Date.now()}</code>\n\n` +
      `<i>Это проверочное сообщение. Если ты его видишь — бот настроен правильно ✅</i>`
    );
    return json({ ok: true, sent: true });
  }

  // ====== 1) CREATE — фронт инициирует оплату ======
  if (body.action === 'create') {
    if (!PLATEGA_MERCHANT_ID || !PLATEGA_SECRET) {
      return json({ error: 'Платёжный сервис не настроен (PLATEGA_*)' }, 500);
    }

    const {
      profileId,
      productId,
      productName,
      price,
      telegramId      = '',
      username        = 'Неизвестный',
      paymentMethodId = 'sbp',
      currency        = 'RUB',
    } = body;

    if (!profileId || !productName || !price) {
      return json({ error: 'Missing required fields' }, 400);
    }

    const paymentMethod = PAYMENT_METHOD_MAP[paymentMethodId];
    if (!paymentMethod) {
      return json({ error: `Метод "${paymentMethodId}" не поддерживается` }, 400);
    }

    const normalizedProductId = productId || productName.toLowerCase().replace(/\s+/g, '_');

    // 1.1 — pending-запись
    const { data: purchase, error: insertErr } = await supabase
      .from('purchases')
      .insert({
        profile_id:     profileId,
        product_id:     normalizedProductId,
        product_name:   productName,
        price:          Number(price),
        status:         'pending',
        payment_method: METHOD_LABELS[paymentMethodId] || paymentMethodId,
      })
      .select()
      .single();

    if (insertErr || !purchase) {
      console.error('[platega-webhook] insert purchase error:', insertErr);
      return json({ error: 'Ошибка создания заявки в БД' }, 500);
    }

    // 1.2 — payload для Platega
    const plategaPayload = {
      paymentMethod,
      paymentDetails: { amount: Number(price), currency },
      description: `Покупка: ${productName}`,
      return: RETURN_URL,
      failedUrl: FAILED_URL,
      payload: JSON.stringify({
        purchaseId:  purchase.id,
        profileId,
        productId:   normalizedProductId,
        productName,
        price:       Number(price),
        telegramId,
        username,
        paymentMethodId,
      }),
    };

    let plategaRes: Response;
    let plategaJson: any;
    try {
      plategaRes = await fetch(PLATEGA_API, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'X-MerchantId':  PLATEGA_MERCHANT_ID,
          'X-Secret':      PLATEGA_SECRET,
        },
        body: JSON.stringify(plategaPayload),
      });
      const txt = await plategaRes.text();
      try { plategaJson = JSON.parse(txt); } catch { plategaJson = { message: txt }; }
    } catch (e) {
      console.error('[platega-webhook] platega fetch error:', e);
      await supabase.from('purchases').delete().eq('id', purchase.id);
      return json({ error: 'Ошибка соединения с Platega' }, 502);
    }

    if (!plategaRes.ok) {
      console.error('[platega-webhook] platega error response:', plategaRes.status, plategaJson);
      await supabase.from('purchases').delete().eq('id', purchase.id);
      return json({ error: plategaJson.message || `Platega ${plategaRes.status}` }, 400);
    }

    const transactionId = plategaJson.transactionId || plategaJson.id;
    const redirect      = plategaJson.redirect;

    await supabase.from('purchases')
      .update({ platega_transaction_id: transactionId })
      .eq('id', purchase.id);

    return json({ redirect, transactionId, purchaseId: purchase.id });
  }

  // ====== 2) CHECK — пользователь нажал "Я оплатил" ======
  if (body.action === 'check') {
    const { transactionId } = body;
    if (!transactionId) return json({ error: 'transactionId обязателен' }, 400);

    const { data: purchase } = await supabase
      .from('purchases')
      .select('*')
      .eq('platega_transaction_id', transactionId)
      .maybeSingle();

    if (purchase?.status === 'approved') {
      return json({ status: 'CONFIRMED', purchaseId: purchase.id });
    }

    let confirmed = false;
    try {
      const res = await fetch(`${PLATEGA_API}/${transactionId}`, {
        method: 'GET',
        headers: { 'X-MerchantId': PLATEGA_MERCHANT_ID, 'X-Secret': PLATEGA_SECRET },
      });
      const txt = await res.text();
      let pj: any; try { pj = JSON.parse(txt); } catch { pj = {}; }
      const status = (pj.status || pj.state || '').toString().toUpperCase();
      confirmed = ['CONFIRMED', 'PAID', 'SUCCESS'].includes(status);
    } catch (e) {
      console.error('[platega-webhook] check status error:', e);
    }

    if (confirmed && purchase && purchase.status !== 'approved') {
      await supabase.from('purchases')
        .update({ status: 'approved', approved_at: new Date().toISOString(), reviewed_at: new Date().toISOString() })
        .eq('id', purchase.id);

      return json({ status: 'CONFIRMED', purchaseId: purchase.id });
    }

    return json({ status: 'PENDING', purchaseId: purchase?.id || null });
  }

  // ====== 3) Колбэк от Platega ======
  const txId  = body.transactionId || body.id;
  const stRaw = (body.status || body.state || '').toString().toUpperCase();
  if (!txId) {
    return json({ error: 'Неизвестный формат запроса' }, 400);
  }

  const isPaid     = ['CONFIRMED', 'PAID', 'SUCCESS'].includes(stRaw);
  const isRejected = ['DECLINED', 'FAILED', 'REJECTED', 'CANCELED', 'CANCELLED'].includes(stRaw);

  let payloadObj: any = {};
  try {
    if (typeof body.payload === 'string') payloadObj = JSON.parse(body.payload);
    else if (body.payload) payloadObj = body.payload;
  } catch { payloadObj = {}; }

  // Находим purchase по transactionId, либо по purchaseId из payload
  let { data: purchase } = await supabase
    .from('purchases')
    .select('*')
    .eq('platega_transaction_id', txId)
    .maybeSingle();

  if (!purchase && payloadObj.purchaseId) {
    const r = await supabase.from('purchases').select('*').eq('id', payloadObj.purchaseId).maybeSingle();
    purchase = r.data || null;
    if (purchase) {
      await supabase.from('purchases')
        .update({ platega_transaction_id: txId })
        .eq('id', purchase.id);
    }
  }

  if (!purchase) {
    console.warn('[platega-webhook] callback: purchase not found for tx', txId);
    return new Response('ok', { status: 200 });
  }

  if (isPaid && purchase.status !== 'approved') {
    await supabase.from('purchases')
      .update({ status: 'approved', approved_at: new Date().toISOString(), reviewed_at: new Date().toISOString() })
      .eq('id', purchase.id);

    // Получаем профиль для уведомления админа
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, telegram_id')
      .eq('id', purchase.profile_id)
      .maybeSingle();

    const username   = profile?.username || '—';
    const telegramId = profile?.telegram_id || '—';

    // Запускаем выдачу инвайт-ссылки в фоне (не блокирует ответ Platega)
    let inviteSummary = 'не выполнено';
    try {
      const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
      const inviteRes = await fetch(`${SUPABASE_URL}/functions/v1/invite-to-group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ purchaseId: purchase.id }),
      });
      const inviteData = await inviteRes.json();
      if (inviteData.success) {
        inviteSummary = inviteData.invite_link
          ? `ссылка готова`
          : 'добавлен автоматически';
      } else {
        inviteSummary = inviteData.error || 'ошибка';
      }
    } catch (e) {
      console.error('[platega-webhook] invite error:', e);
      inviteSummary = 'ошибка вызова invite-to-group';
    }

    await notifyAdmins(
      `✅ <b>Оплата подтверждена (Platega)</b>\n\n` +
      `👤 ${username}\n` +
      `📱 ${telegramId}\n` +
      `📦 ${purchase.product_name}\n` +
      `💰 ${purchase.price} руб\n` +
      `💳 ${purchase.payment_method || '—'}\n` +
      `👥 Доступ в группу: ${inviteSummary}\n\n` +
      `🆔 <code>${purchase.id}</code>\n` +
      `🔗 tx: <code>${txId}</code>`
    );
  } else if (isRejected && purchase.status === 'pending') {
    await supabase.from('purchases')
      .update({ status: 'rejected', rejected_at: new Date().toISOString() })
      .eq('id', purchase.id);
  }

  return new Response('ok', { status: 200 });
});
