// ============================================================
// platega-webhook (Metacore project)
// Проект: nsrilzwmclsiwtrsomer
// ============================================================
// Обрабатывает три типа запросов:
//   1) { action: 'create', ... }  — создаёт платёж в Platega + pending-запись
//   2) { action: 'check',  ... }  — проверяет статус платежа в Platega
//   3) Колбэк от Platega           — переводит запись в approved/rejected
// ============================================================

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-merchantid, x-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PAYMENT_METHOD_MAP: Record<string, number> = {
  sbp:    2,   // СБП QR
  crypto: 13,  // Криптовалюта
};

const METHOD_LABELS: Record<string, string> = {
  sbp:    'СБП',
  crypto: 'Криптовалюта',
};

const PLATEGA_API = 'https://app.platega.io/transaction/process';

// ------------------------------------------------------------
// Тарифы Metacore — единственный источник правды на сервере.
// Цена и количество токенов берутся ОТСЮДА, а не из тела запроса —
// это защищает от подмены цены на стороне клиента.
// ------------------------------------------------------------
const TIERS: Record<string, { name: string; price: number; tokens: number }> = {
  demo:     { name: 'Metacore Demo',     price: 1999,  tokens: 200   },
  standard: { name: 'Metacore Standard', price: 9990,  tokens: 7000  },
  pro:      { name: 'Metacore Pro',      price: 15000, tokens: 15000 },
};

// ------------------------------------------------------------
// helpers
// ------------------------------------------------------------
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function parseTelegramUserId(raw: string): number | null {
  if (!raw) return null;
  if (raw.startsWith('@id_')) {
    const n = parseInt(raw.replace('@id_', ''), 10);
    return Number.isNaN(n) ? null : n;
  }
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  return null;
}

async function sendTelegram(botToken: string, chatId: string | number, text: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    const data = await res.json();
    console.log('[platega-webhook] sendTelegram', { chatId, ok: data.ok, err: data.description });
    return data.ok === true;
  } catch (e) {
    console.error('[platega-webhook] sendTelegram error', e);
    return false;
  }
}

async function notifyAdmins(text: string) {
  const ADMIN_BOT_TOKEN = Deno.env.get('ADMIN_BOT_TOKEN') || '';
  const ADMIN_CHAT_IDS = (Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (!ADMIN_BOT_TOKEN || ADMIN_CHAT_IDS.length === 0) return;
  for (const id of ADMIN_CHAT_IDS) await sendTelegram(ADMIN_BOT_TOKEN, id, text);
}

// Атомарно "берёт" свободный ключ из metacore_license_keys под нужный tier
// (фильтр по tokens_limit) и привязывает к покупке.
// Если у покупки уже есть activation_key — возвращает его (повторно не выдаёт).
// Если свободных ключей под этот tier нет — возвращает null и шлёт админу алерт.
async function assignKeyToPurchase(supabase: any, purchase: any): Promise<string | null> {
  if (purchase.activation_key) return purchase.activation_key;

  const tier = (purchase.tier || 'demo') as string;
  const tierCfg = TIERS[tier] || TIERS.demo;
  const tokensLimit = tierCfg.tokens;

  // 1. Ищем первый свободный ключ под этот tier (по tokens_limit)
  const { data: freeKey } = await supabase
    .from('metacore_license_keys')
    .select('id, key')
    .eq('is_used', false)
    .eq('tokens_limit', tokensLimit)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!freeKey) {
    await notifyAdmins(
      `⚠️ <b>Metacore — нет свободных ключей!</b>\n\n` +
      `Покупка <code>${purchase.id}</code> (тариф <b>${tierCfg.name}</b>, ${tokensLimit} токенов) подтверждена, но ключ выдать нечего.\n` +
      `Загрузи в <code>metacore_license_keys</code> ключи с <code>tokens_limit = ${tokensLimit}</code>.`
    );
    return null;
  }

  // 2. Атомарно занимаем (optimistic lock через is_used=false)
  const { data: lockedKey, error: lockErr } = await supabase
    .from('metacore_license_keys')
    .update({
      is_used:             true,
      used_by_purchase_id: purchase.id,
      used_at:             new Date().toISOString(),
    })
    .eq('id', freeKey.id)
    .eq('is_used', false)
    .select('key')
    .maybeSingle();

  if (lockErr || !lockedKey) {
    console.warn('[assignKey] lock failed, retrying once', lockErr);
    return await assignKeyToPurchase(supabase, purchase);
  }

  // 3. Сохраняем копию ключа в purchase
  await supabase.from('metacore_purchases')
    .update({ activation_key: lockedKey.key })
    .eq('id', purchase.id);

  return lockedKey.key;
}

// ------------------------------------------------------------
// main
// ------------------------------------------------------------
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

  console.log('[platega-webhook] incoming', JSON.stringify(body).slice(0, 800));

  // ====== 1) CREATE — фронт инициирует оплату ======
  if (body.action === 'create') {
    if (!PLATEGA_MERCHANT_ID || !PLATEGA_SECRET) {
      return json({ error: 'Платёжный сервис не настроен (PLATEGA_*)' }, 500);
    }

    const {
      profileId,
      telegramId     = '',
      username       = 'Неизвестный',
      paymentMethodId = 'sbp',
      currency       = 'RUB',
      tier           = 'demo',
    } = body;

    // Цена и токены берутся ТОЛЬКО с сервера — нельзя подменить с клиента.
    const tierCfg = TIERS[tier];
    if (!tierCfg) return json({ error: `Неизвестный тариф: ${tier}` }, 400);

    const amount      = tierCfg.price;
    const productId   = `metacore_${tier}`;
    const productName = tierCfg.name;
    const tokens      = tierCfg.tokens;

    if (!profileId) return json({ error: 'profileId обязателен' }, 400);
    const paymentMethod = PAYMENT_METHOD_MAP[paymentMethodId];
    if (!paymentMethod) return json({ error: `Метод "${paymentMethodId}" не поддерживается для Metacore` }, 400);

    // 1.1 — pending-запись в metacore.purchases
    const { data: purchase, error: insertErr } = await supabase
      .from('metacore_purchases')
      .insert({
        profile_id:        profileId,
        telegram_id:       telegramId,
        username,
        product_id:        productId,
        product_name:      productName,
        price:             amount,
        tier,
        tokens_purchased:  tokens,
        status:            'pending',
        payment_method:    METHOD_LABELS[paymentMethodId] || paymentMethodId,
      })
      .select()
      .single();

    if (insertErr || !purchase) {
      console.error('[platega-webhook] insert purchase error', insertErr);
      return json({ error: 'Ошибка создания заявки в БД' }, 500);
    }

    // 1.2 — собираем payload для Platega
    const telegramIdNumeric = parseTelegramUserId(telegramId) || telegramId || '';
    const plategaPayload = {
      paymentMethod,
      paymentDetails: { amount: Number(amount), currency },
      description: `Подписка: ${productName}`,
      return: RETURN_URL,
      failedUrl: FAILED_URL,
      payload: JSON.stringify({
        source:        'metacore',
        purchaseId:    purchase.id,
        profileId,
        telegramId,
        telegramIdNumeric,
        username,
        productId,
        productName,
        price:         amount,
        tier,
        tokens,
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
      console.error('[platega-webhook] platega fetch error', e);
      await supabase.from('metacore_purchases').delete().eq('id', purchase.id);
      return json({ error: 'Ошибка соединения с Platega' }, 502);
    }

    if (!plategaRes.ok) {
      console.error('[platega-webhook] platega error response', plategaRes.status, plategaJson);
      await supabase.from('metacore_purchases').delete().eq('id', purchase.id);
      return json({ error: plategaJson.message || `Platega ${plategaRes.status}` }, 400);
    }

    const transactionId = plategaJson.transactionId || plategaJson.id;
    const redirect      = plategaJson.redirect;

    await supabase.from('metacore_purchases')
      .update({ platega_transaction_id: transactionId })
      .eq('id', purchase.id);

    // Уведомление шлём только в колбэке от Platega при реальной оплате,
    // а не на этапе клика "Оплатить".
    return json({ redirect, transactionId, purchaseId: purchase.id });
  }

  // ====== 2) CHECK — пользователь нажал "Я оплатил" ======
  if (body.action === 'check') {
    const { transactionId } = body;
    if (!transactionId) return json({ error: 'transactionId обязателен' }, 400);

    const { data: purchase } = await supabase
      .from('metacore_purchases')
      .select('*')
      .eq('platega_transaction_id', transactionId)
      .maybeSingle();

    if (purchase?.status === 'approved') {
      return json({ status: 'CONFIRMED', purchaseId: purchase.id });
    }

    // Спрашиваем статус у Platega
    let confirmed = false;
    try {
      const res = await fetch(`${PLATEGA_API}/${transactionId}`, {
        method: 'GET',
        headers: { 'X-MerchantId': PLATEGA_MERCHANT_ID, 'X-Secret': PLATEGA_SECRET },
      });
      const txt = await res.text();
      let pj: any; try { pj = JSON.parse(txt); } catch { pj = {}; }
      console.log('[platega-webhook] check status response', res.status, pj);
      const status = (pj.status || pj.state || '').toString().toUpperCase();
      confirmed = status === 'CONFIRMED' || status === 'PAID' || status === 'SUCCESS';
    } catch (e) {
      console.error('[platega-webhook] check status error', e);
    }

    if (confirmed && purchase && purchase.status !== 'approved') {
      await supabase.from('metacore_purchases')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', purchase.id);

      // Перечитываем purchase, чтобы передать актуальный объект в assignKey
      const { data: fresh } = await supabase
        .from('metacore_purchases').select('*').eq('id', purchase.id).maybeSingle();
      const issuedKey = fresh ? await assignKeyToPurchase(supabase, fresh) : null;

      return json({ status: 'CONFIRMED', purchaseId: purchase.id, activationKey: issuedKey });
    }

    return json({ status: 'PENDING', purchaseId: purchase?.id || null });
  }

  // ====== 3) Колбэк от Platega ======
  // Platega шлёт сюда POST с информацией о статусе платежа.
  // Признак — наличие transactionId/id и status в теле, без action.
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
    .from('metacore_purchases')
    .select('*')
    .eq('platega_transaction_id', txId)
    .maybeSingle();

  if (!purchase && payloadObj.purchaseId) {
    const r = await supabase.from('metacore_purchases').select('*').eq('id', payloadObj.purchaseId).maybeSingle();
    purchase = r.data || null;
    if (purchase) {
      await supabase.from('metacore_purchases')
        .update({ platega_transaction_id: txId })
        .eq('id', purchase.id);
    }
  }

  if (!purchase) {
    console.warn('[platega-webhook] callback: purchase not found for tx', txId);
    return new Response('ok', { status: 200 });
  }

  if (isPaid && purchase.status !== 'approved') {
    await supabase.from('metacore_purchases')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', purchase.id);

    // Выдаём ключ из пула metacore_keys
    const issuedKey = await assignKeyToPurchase(supabase, { ...purchase, status: 'approved' });

    const tierLabel = TIERS[purchase.tier as string]?.name || purchase.product_name || 'Metacore';
    await notifyAdmins(
      `✅ <b>${tierLabel} — оплата подтверждена</b>\n\n` +
      `👤 ${purchase.username || '—'}\n` +
      `📱 ${purchase.telegram_id || '—'}\n` +
      `🎟 Тариф: <b>${purchase.tier || 'demo'}</b> · ${purchase.tokens_purchased ?? '—'} токенов\n` +
      `💰 ${purchase.price} руб\n` +
      `💳 ${purchase.payment_method || '—'}\n` +
      (issuedKey
        ? `🔑 <b>Ключ:</b> <code>${issuedKey}</code>\n`
        : `⚠️ Ключ НЕ выдан (нет свободных под этот тариф)\n`) +
      `\n🆔 <code>${purchase.id}</code>\n` +
      `🔗 tx: <code>${txId}</code>`
    );
  } else if (isRejected && purchase.status === 'pending') {
    await supabase.from('metacore_purchases')
      .update({ status: 'rejected', rejected_at: new Date().toISOString() })
      .eq('id', purchase.id);
  }

  return new Response('ok', { status: 200 });
});
