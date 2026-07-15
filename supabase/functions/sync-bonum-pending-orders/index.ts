import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

type BonumAuthResponse = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
};

type CachedTokenRow = {
  terminal_id: string;
  access_token: string;
  refresh_token: string;
  access_expires_at: string;
  refresh_expires_at: string;
};

class BonumHttpError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string, label: string) {
    super(`${label} (${status}): ${body}`);
    this.name = 'BonumHttpError';
    this.status = status;
    this.body = body;
  }
}

const TOKEN_MARGIN_MS = 60_000;
const PAID_STATUS_VALUES = new Set([
  'SUCCESS',
  'PAID',
  'COMPLETED',
  'AUTHORIZED',
  'SETTLED',
]);

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function parseAuthResponse(res: Response, label: string): Promise<BonumAuthResponse> {
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new BonumHttpError(res.status, text, label);
  }
  const data = JSON.parse(text) as BonumAuthResponse;
  if (!data.accessToken || !data.refreshToken) {
    throw new Error(`${label}: missing tokens`);
  }
  return data;
}

async function bonumAuthCreate(
  baseUrl: string,
  appSecret: string,
  terminalId: string,
): Promise<BonumAuthResponse> {
  const res = await fetch(`${baseUrl}/bonum-gateway/ecommerce/auth/create`, {
    method: 'GET',
    headers: {
      Authorization: `AppSecret ${appSecret}`,
      'X-TERMINAL-ID': terminalId,
      'Accept-Language': 'mn',
    },
  });
  return parseAuthResponse(res, 'Bonum auth create');
}

async function bonumAuthRefresh(
  baseUrl: string,
  refreshToken: string,
): Promise<BonumAuthResponse> {
  const res = await fetch(`${baseUrl}/bonum-gateway/ecommerce/auth/refresh`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${refreshToken}`,
      'Accept-Language': 'mn',
    },
  });
  return parseAuthResponse(res, 'Bonum auth refresh');
}

async function upsertTokenCache(
  supabaseAdmin: SupabaseClient,
  terminalId: string,
  data: BonumAuthResponse,
): Promise<void> {
  const now = Date.now();
  await supabaseAdmin.from('bonum_auth_tokens').upsert(
    {
      terminal_id: terminalId,
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      access_expires_at: new Date(
        now + data.expiresIn * 1000 - TOKEN_MARGIN_MS,
      ).toISOString(),
      refresh_expires_at: new Date(
        now + data.refreshExpiresIn * 1000 - TOKEN_MARGIN_MS,
      ).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'terminal_id' },
  );
}

async function getBonumAccessToken(params: {
  supabaseAdmin: SupabaseClient;
  baseUrl: string;
  appSecret: string;
  terminalId: string;
}): Promise<string> {
  const { supabaseAdmin, baseUrl, appSecret, terminalId } = params;
  const now = Date.now();

  const { data: cached } = await supabaseAdmin
    .from('bonum_auth_tokens')
    .select(
      'terminal_id, access_token, refresh_token, access_expires_at, refresh_expires_at',
    )
    .eq('terminal_id', terminalId)
    .maybeSingle();

  const row = cached as CachedTokenRow | null;

  if (row?.access_token) {
    const accessExp = Date.parse(row.access_expires_at);
    if (Number.isFinite(accessExp) && accessExp > now) {
      return row.access_token;
    }
  }

  if (row?.refresh_token) {
    const refreshExp = Date.parse(row.refresh_expires_at);
    if (Number.isFinite(refreshExp) && refreshExp > now) {
      try {
        const refreshed = await bonumAuthRefresh(baseUrl, row.refresh_token);
        await upsertTokenCache(supabaseAdmin, terminalId, refreshed);
        return refreshed.accessToken;
      } catch {
        // fall through
      }
    }
  }

  const created = await bonumAuthCreate(baseUrl, appSecret, terminalId);
  await upsertTokenCache(supabaseAdmin, terminalId, created);
  return created.accessToken;
}

function isPaidStatusValue(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toUpperCase();
  return PAID_STATUS_VALUES.has(normalized);
}

function isInvoicePaidPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }
  const record = payload as Record<string, unknown>;
  const candidates = [
    record.status,
    record.paymentStatus,
    record.payment_status,
    record.invoiceStatus,
    record.state,
    record.paid,
    record.isPaid,
  ];
  for (const candidate of candidates) {
    if (isPaidStatusValue(candidate)) return true;
  }
  const nested = record.data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return isInvoicePaidPayload(nested);
  }
  return false;
}

async function fetchInvoicePaid(
  baseUrl: string,
  accessToken: string,
  invoiceId: string,
): Promise<boolean> {
  const res = await fetch(
    `${baseUrl}/bonum-gateway/ecommerce/invoices/${encodeURIComponent(invoiceId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Accept-Language': 'mn',
      },
    },
  );
  if (!res.ok) return false;
  const payload = await res.json().catch(() => null);
  return isInvoicePaidPayload(payload);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim();
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim();
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  const bonumBaseUrl = (
    Deno.env.get('BONUM_GATEWAY_BASE_URL') ?? 'https://apis.bonum.mn'
  )
    .trim()
    .replace(/\/+$/, '');
  const bonumAppSecret = Deno.env.get('BONUM_APP_SECRET')?.trim();
  const bonumTerminalId = Deno.env.get('BONUM_TERMINAL_ID')?.trim();

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json(500, { error: 'Missing Supabase env vars' });
  }
  if (!bonumAppSecret || !bonumTerminalId) {
    return json(500, { error: 'Missing Bonum env vars' });
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
  if (userErr || !userRes.user) {
    return json(401, { error: 'Unauthorized' });
  }
  const userId = userRes.user.id;

  const { data: orders, error: ordersErr } = await supabaseAdmin
    .from('orders')
    .select('id, bonum_invoice_id, payment_status, payment_method')
    .eq('user_id', userId)
    .in('payment_status', ['unpaid', 'pending'])
    .not('bonum_invoice_id', 'is', null)
    .limit(10);

  if (ordersErr) {
    return json(500, { error: 'Failed to load pending orders' });
  }

  const pending = (orders ?? []).filter((order) => {
    const method = String(order.payment_method ?? '').toLowerCase();
    const invoiceId = String(order.bonum_invoice_id ?? '').trim();
    return method === 'qpay' && invoiceId.length > 0;
  });

  if (pending.length === 0) {
    return json(200, { synced: 0 });
  }

  let accessToken: string;
  try {
    accessToken = await getBonumAccessToken({
      supabaseAdmin,
      baseUrl: bonumBaseUrl,
      appSecret: bonumAppSecret,
      terminalId: bonumTerminalId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bonum auth failed';
    return json(502, { error: message });
  }

  let synced = 0;
  for (const order of pending) {
    const invoiceId = String(order.bonum_invoice_id ?? '').trim();
    const paid = await fetchInvoicePaid(bonumBaseUrl, accessToken, invoiceId);
    if (!paid) continue;

    const { error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'paid',
        status: 'Confirmed',
        paid_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .neq('payment_status', 'paid');

    if (!updateErr) synced += 1;
  }

  return json(200, { synced });
});
