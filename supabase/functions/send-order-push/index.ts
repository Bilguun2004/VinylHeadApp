import { createClient } from 'jsr:@supabase/supabase-js@2';

type SendOrderPushInput = {
  orderId: string;
};

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

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function formatMnt(amount: number): string {
  return `₮${Math.round(amount).toLocaleString('en-US')}`;
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

async function listAllAdminUserIds(supabaseAdmin: ReturnType<typeof createClient>) {
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
      const role = String((u.app_metadata as Record<string, unknown> | null)?.role ?? '');
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN')?.trim();

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json(500, { error: 'Missing Supabase env vars' });
  }

  const authHeader = req.headers.get('Authorization') ?? '';

  const supabaseAuthed = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: userRes, error: userErr } = await supabaseAuthed.auth.getUser();
  if (userErr) return json(401, { error: 'Unauthorized' });
  const caller = userRes.user;
  if (!caller) return json(401, { error: 'Unauthorized' });

  let input: SendOrderPushInput;
  try {
    input = (await req.json()) as SendOrderPushInput;
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const orderId = String(input.orderId ?? '').trim();
  if (!orderId) return json(400, { error: 'Missing orderId' });

  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('id, user_id, order_number, status, total_amount, delivery_info')
    .eq('id', orderId)
    .single();
  if (orderErr) return json(404, { error: 'Order not found' });

  const isCallerAdmin =
    String((caller.app_metadata as Record<string, unknown> | null)?.role ?? '') ===
      'admin';
  if (!isCallerAdmin && caller.id !== order.user_id) {
    return json(403, { error: 'Forbidden' });
  }

  const status = String(order.status ?? '').trim().toLowerCase();
  if (status !== 'confirmed') {
    return json(200, { tokenCount: 0, sent: 0, failed: 0, skipped: true, reason: 'not_confirmed' });
  }

  const adminIds = await listAllAdminUserIds(supabaseAdmin);
  if (adminIds.length === 0) {
    return json(200, { tokenCount: 0, sent: 0, failed: 0 });
  }

  const { data: tokens, error: tokenErr } = await supabaseAdmin
    .from('expo_push_tokens')
    .select('token')
    .in('user_id', adminIds);
  if (tokenErr) return json(500, { error: 'Failed to load tokens' });

  const uniqueTokens = [
    ...new Set((tokens ?? []).map((t) => (t.token ?? '').trim()).filter(Boolean)),
  ];

  const deliveryInfo =
    order.delivery_info && typeof order.delivery_info === 'object' && !Array.isArray(order.delivery_info)
      ? (order.delivery_info as Record<string, unknown>)
      : null;
  const customerName = customerNameFromDeliveryInfo(deliveryInfo);
  const orderNumber = String(order.order_number ?? '').trim() || order.id.slice(0, 8);
  const total = Number(order.total_amount ?? 0);

  const title = 'Шинэ захиалга';
  const body = `${customerName} · #${orderNumber} · ${formatMnt(total)}`;

  const pushData: Record<string, string> = {
    type: 'order',
    orderId,
    orderNumber,
    recipientRole: 'admin',
    customerName,
  };

  const messages: ExpoPushMessage[] = uniqueTokens.map((to) => ({
    to,
    title,
    body,
    sound: 'default',
    priority: 'high',
    channelId: 'default',
    data: pushData,
  }));

  try {
    const summary = await sendExpoPushBatch(messages, expoAccessToken);
    return json(200, { tokenCount: uniqueTokens.length, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send push';
    return json(500, { error: message });
  }
});
