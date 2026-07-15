import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

type CreateInvoiceInput = {
  orderId: string;
};

type BonumAuthResponse = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
};

type BonumInvoiceResponse = {
  invoiceId: string;
  followUpLink: string;
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

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isBonumRateLimit(status: number, body: string): boolean {
  if (status === 429) return true;
  return body.includes('ERROR_USE_EXISTING_TOKEN');
}

async function parseAuthResponse(res: Response, label: string): Promise<BonumAuthResponse> {
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new BonumHttpError(res.status, text, label);
  }
  let data: BonumAuthResponse;
  try {
    data = JSON.parse(text) as BonumAuthResponse;
  } catch {
    throw new Error(`${label}: invalid JSON`);
  }
  if (!data.accessToken || !data.refreshToken) {
    throw new Error(`${label}: missing tokens`);
  }
  if (!Number.isFinite(data.expiresIn) || !Number.isFinite(data.refreshExpiresIn)) {
    throw new Error(`${label}: missing expiresIn fields`);
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
  const { error } = await supabaseAdmin.from('bonum_auth_tokens').upsert(
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
  if (error) {
    throw new Error(`Failed to cache Bonum tokens: ${error.message}`);
  }
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
        // fall through to create
      }
    }
  }

  try {
    const created = await bonumAuthCreate(baseUrl, appSecret, terminalId);
    await upsertTokenCache(supabaseAdmin, terminalId, created);
    return created.accessToken;
  } catch (err) {
    if (
      err instanceof BonumHttpError &&
      isBonumRateLimit(err.status, err.body) &&
      row?.refresh_token
    ) {
      try {
        const refreshed = await bonumAuthRefresh(baseUrl, row.refresh_token);
        await upsertTokenCache(supabaseAdmin, terminalId, refreshed);
        return refreshed.accessToken;
      } catch {
        // keep original rate-limit error
      }
    }
    throw err;
  }
}

async function bonumCreateInvoice(params: {
  baseUrl: string;
  accessToken: string;
  amount: number;
  callback: string;
  transactionId: string;
}): Promise<BonumInvoiceResponse> {
  const res = await fetch(`${params.baseUrl}/bonum-gateway/ecommerce/invoices`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Accept-Language': 'mn',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amount,
      callback: params.callback,
      transactionId: params.transactionId,
      expiresIn: 1800,
      providers: ['QPAY'],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new BonumHttpError(res.status, text, 'Bonum createInvoice');
  }
  const data = (await res.json()) as BonumInvoiceResponse;
  if (!data.invoiceId || !data.followUpLink) {
    throw new Error('Bonum createInvoice missing invoiceId or followUpLink');
  }
  return data;
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

  let input: CreateInvoiceInput;
  try {
    input = (await req.json()) as CreateInvoiceInput;
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const orderId = String(input.orderId ?? '').trim();
  if (!orderId) {
    return json(400, { error: 'Missing orderId' });
  }

  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select(
      'id, user_id, payment_method, payment_status, total_amount, bonum_invoice_id, bonum_follow_up_link',
    )
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    return json(404, { error: 'Order not found' });
  }
  if (order.user_id !== userId) {
    return json(403, { error: 'Forbidden' });
  }
  if (String(order.payment_method ?? '').toLowerCase() !== 'qpay') {
    return json(400, { error: 'Order is not QPay' });
  }
  if (String(order.payment_status ?? '').toLowerCase() === 'paid') {
    return json(400, { error: 'Order already paid' });
  }

  const existingLink = String(order.bonum_follow_up_link ?? '').trim();
  if (existingLink) {
    return json(200, {
      invoiceId: order.bonum_invoice_id ?? '',
      followUpLink: existingLink,
      orderId: order.id,
    });
  }

  const amount = Number(order.total_amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return json(400, { error: 'Invalid order amount' });
  }

  const webhookUrl = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/bonum-webhook`;

  try {
    const accessToken = await getBonumAccessToken({
      supabaseAdmin,
      baseUrl: bonumBaseUrl,
      appSecret: bonumAppSecret,
      terminalId: bonumTerminalId,
    });
    const invoice = await bonumCreateInvoice({
      baseUrl: bonumBaseUrl,
      accessToken,
      amount: Math.round(amount),
      callback: webhookUrl,
      transactionId: order.id,
    });

    const { error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({
        bonum_invoice_id: invoice.invoiceId,
        bonum_transaction_id: order.id,
        bonum_follow_up_link: invoice.followUpLink,
        payment_status: 'pending',
      })
      .eq('id', order.id);

    if (updateErr) {
      return json(500, { error: 'Failed to update order with invoice' });
    }

    return json(200, {
      invoiceId: invoice.invoiceId,
      followUpLink: invoice.followUpLink,
      orderId: order.id,
    });
  } catch (err) {
    if (err instanceof BonumHttpError && isBonumRateLimit(err.status, err.body)) {
      return json(429, {
        error:
          'Bonum token rate limit. Түр хүлээгээд (~1 мин) дахин оролдоно уу.',
      });
    }
    const message = err instanceof Error ? err.message : 'Bonum invoice failed';
    return json(502, { error: message });
  }
});
