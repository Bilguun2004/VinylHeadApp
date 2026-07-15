import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
  data?: Record<string, string>;
};

type ExpoPushTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

type WebhookEvent = {
  type?: string;
  status?: string;
  message?: string;
  body?: Record<string, unknown>;
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function verifyWebhookChecksum(
  rawBody: string,
  checksumHeader: string | null,
  checksumKey: string,
): boolean {
  if (!checksumHeader) return false;
  const expected = createHmac('sha256', checksumKey)
    .update(rawBody, 'utf8')
    .digest('hex');
  return timingSafeEqualHex(expected.toLowerCase(), checksumHeader.toLowerCase());
}

function formatMnt(amount: number): string {
  return `₮${Math.round(amount).toLocaleString('en-US')}`;
}

function readTransactionIdFromRecord(
  record: Record<string, unknown> | undefined,
): string {
  if (!record) return '';
  const candidates = [
    record.transactionId,
    record.transaction_id,
    record.merchantTransactionId,
    record.merchant_transaction_id,
    record.orderId,
    record.order_id,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function readTransactionId(event: WebhookEvent): string {
  const fromBody = readTransactionIdFromRecord(event.body);
  if (fromBody) return fromBody;

  if (event.body && typeof event.body === 'object' && !Array.isArray(event.body)) {
    const nested = (event.body as Record<string, unknown>).data;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const fromNested = readTransactionIdFromRecord(
        nested as Record<string, unknown>,
      );
      if (fromNested) return fromNested;
    }
  }

  return readTransactionIdFromRecord(event as unknown as Record<string, unknown>);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function findOrderByTransactionId(
  supabaseAdmin: ReturnType<typeof createClient>,
  transactionId: string,
) {
  const byTxn = await supabaseAdmin
    .from('orders')
    .select('id, payment_status, bonum_invoice_id')
    .eq('bonum_transaction_id', transactionId)
    .maybeSingle();
  if (byTxn.data) return byTxn;

  if (!UUID_RE.test(transactionId)) {
    return { data: null, error: byTxn.error };
  }

  return supabaseAdmin
    .from('orders')
    .select('id, payment_status, bonum_invoice_id')
    .eq('id', transactionId)
    .maybeSingle();
}

async function sendExpoPushBatch(
  messages: ExpoPushMessage[],
  expoAccessToken?: string,
): Promise<{ sent: number; failed: number }> {
  if (messages.length === 0) return { sent: 0, failed: 0 };

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  if (expoAccessToken?.trim()) {
    headers.Authorization = `Bearer ${expoAccessToken.trim()}`;
  }

  let sent = 0;
  let failed = 0;
  const chunkSize = 100;

  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to send push');
    }
    const tickets = (await res.json()) as { data?: ExpoPushTicket[] };
    const rows = tickets.data ?? [];
    for (const ticket of rows) {
      if (ticket.status === 'ok') sent += 1;
      else failed += 1;
    }
  }

  return { sent, failed };
}

async function listAllAdminUserIds(
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<string[]> {
  const adminIds: string[] = [];
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    const users = data.users ?? [];
    for (const u of users) {
      const role = String(
        (u.app_metadata as Record<string, unknown> | null)?.role ?? '',
      );
      if (role === 'admin') adminIds.push(u.id);
    }
    if (users.length < perPage) break;
    page += 1;
  }

  return adminIds;
}

function customerNameFromDeliveryInfo(
  deliveryInfo: Record<string, unknown> | null,
): string {
  const name = deliveryInfo?.full_name;
  return typeof name === 'string' && name.trim() ? name.trim() : 'Хэрэглэгч';
}

async function notifyAdminsOfPaidOrder(params: {
  supabaseAdmin: ReturnType<typeof createClient>;
  orderId: string;
  expoAccessToken?: string;
}): Promise<void> {
  const { supabaseAdmin, orderId, expoAccessToken } = params;

  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, status, total_amount, delivery_info')
    .eq('id', orderId)
    .single();
  if (orderErr || !order) return;

  const status = String(order.status ?? '').trim().toLowerCase();
  if (status !== 'confirmed') return;

  const adminIds = await listAllAdminUserIds(supabaseAdmin);
  if (adminIds.length === 0) return;

  const { data: tokens, error: tokenErr } = await supabaseAdmin
    .from('expo_push_tokens')
    .select('token')
    .in('user_id', adminIds);
  if (tokenErr) return;

  const uniqueTokens = [
    ...new Set(
      (tokens ?? []).map((t) => (t.token ?? '').trim()).filter(Boolean),
    ),
  ];
  if (uniqueTokens.length === 0) return;

  const deliveryInfo =
    order.delivery_info &&
    typeof order.delivery_info === 'object' &&
    !Array.isArray(order.delivery_info)
      ? (order.delivery_info as Record<string, unknown>)
      : null;
  const customerName = customerNameFromDeliveryInfo(deliveryInfo);
  const orderNumber =
    String(order.order_number ?? '').trim() || order.id.slice(0, 8);
  const total = Number(order.total_amount ?? 0);

  const messages: ExpoPushMessage[] = uniqueTokens.map((to) => ({
    to,
    title: 'Шинэ захиалга',
    body: `${customerName} · #${orderNumber} · ${formatMnt(total)}`,
    sound: 'default',
    priority: 'high',
    channelId: 'default',
    data: {
      type: 'order',
      orderId,
      orderNumber,
      recipientRole: 'admin',
      customerName,
    },
  }));

  await sendExpoPushBatch(messages, expoAccessToken).catch(() => undefined);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  const checksumKey = Deno.env.get('BONUM_MERCHANT_CHECKSUM_KEY')?.trim();
  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN')?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: 'Missing Supabase env vars' });
  }
  if (!checksumKey) {
    return json(500, { error: 'Missing BONUM_MERCHANT_CHECKSUM_KEY' });
  }

  const rawBody = await req.text();
  const checksumHeader = req.headers.get('x-checksum-v2');

  if (!verifyWebhookChecksum(rawBody, checksumHeader, checksumKey)) {
    return json(401, { error: 'Invalid checksum' });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const eventType = String(event.type ?? '').trim().toUpperCase();
  const eventStatus = String(event.status ?? '').trim().toUpperCase();

  if (eventType !== 'PAYMENT') {
    return json(200, { ok: true, ignored: true, reason: 'not_payment' });
  }

  const transactionId = readTransactionId(event);
  if (!transactionId) {
    return json(400, { error: 'Missing transactionId in webhook body' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: order, error: orderErr } = await findOrderByTransactionId(
    supabaseAdmin,
    transactionId,
  );

  if (orderErr) {
    return json(500, { error: 'Failed to load order' });
  }
  if (!order) {
    return json(404, { error: 'Order not found' });
  }

  const currentPayment = String(order.payment_status ?? '').toLowerCase();

  if (eventStatus === 'SUCCESS') {
    if (currentPayment === 'paid') {
      return json(200, { ok: true, idempotent: true });
    }

    const invoiceIdFromBody =
      typeof event.body?.invoiceId === 'string'
        ? event.body.invoiceId
        : typeof event.body?.invoice_id === 'string'
          ? event.body.invoice_id
          : null;

    const { error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'Confirmed',
        paid_at: new Date().toISOString(),
        ...(invoiceIdFromBody && !order.bonum_invoice_id
          ? { bonum_invoice_id: invoiceIdFromBody }
          : {}),
      })
      .eq('id', order.id);

    if (updateErr) {
      return json(500, { error: 'Failed to mark order paid' });
    }

    await notifyAdminsOfPaidOrder({
      supabaseAdmin,
      orderId: order.id,
      expoAccessToken,
    });

    return json(200, { ok: true, paid: true });
  }

  if (eventStatus === 'FAILED') {
    if (currentPayment === 'paid') {
      return json(200, { ok: true, ignored: true, reason: 'already_paid' });
    }

    const { error: failErr } = await supabaseAdmin
      .from('orders')
      .update({ payment_status: 'failed' })
      .eq('id', order.id);

    if (failErr) {
      return json(500, { error: 'Failed to mark order failed' });
    }

    return json(200, { ok: true, failed: true });
  }

  return json(200, { ok: true, ignored: true, reason: 'unknown_status' });
});
