import { createClient } from 'jsr:@supabase/supabase-js@2';

type SendChatPushInput = {
  threadId: string;
  messageId: string;
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

  let input: SendChatPushInput;
  try {
    input = (await req.json()) as SendChatPushInput;
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const threadId = String(input.threadId ?? '').trim();
  const messageId = String(input.messageId ?? '').trim();
  if (!threadId || !messageId) {
    return json(400, { error: 'Missing threadId/messageId' });
  }

  // Fetch message + thread (service role to avoid RLS surprises), then authorize caller using RLS via authed client.
  const { data: msg, error: msgErr } = await supabaseAdmin
    .from('chat_messages')
    .select('id, thread_id, sender_role, sender_user_id, text, image_url, created_at')
    .eq('id', messageId)
    .single();
  if (msgErr) return json(404, { error: 'Message not found' });
  if (msg.thread_id !== threadId) return json(400, { error: 'Message/thread mismatch' });

  const { data: thread, error: threadErr } = await supabaseAdmin
    .from('chat_threads')
    .select('id, user_id, user_last_read_at, admin_last_read_at')
    .eq('id', threadId)
    .single();
  if (threadErr) return json(404, { error: 'Thread not found' });

  // Authorization: caller must be admin OR the user that owns the thread.
  const isCallerAdmin = String((caller.app_metadata as Record<string, unknown> | null)?.role ?? '') ===
    'admin';
  if (!isCallerAdmin && caller.id !== thread.user_id) {
    return json(403, { error: 'Forbidden' });
  }

  // Decide recipients.
  let recipientUserIds: string[] = [];
  const now = Date.now();
  const ACTIVE_CHAT_WINDOW_MS = 30_000;

  if (msg.sender_role === 'user') {
    // Suppress only if an admin pinged read within the last 30s (actively in chat).
    if (thread.admin_last_read_at) {
      const lastRead = Date.parse(thread.admin_last_read_at);
      if (Number.isFinite(lastRead) && now - lastRead < ACTIVE_CHAT_WINDOW_MS) {
        return json(200, { tokenCount: 0, sent: 0, failed: 0, suppressed: true, reason: 'admin_active' });
      }
    }
    // user -> all admins
    recipientUserIds = await listAllAdminUserIds(supabaseAdmin);
  } else {
    // Suppress only if the user pinged read within the last 30s (actively in chat).
    if (thread.user_last_read_at) {
      const lastRead = Date.parse(thread.user_last_read_at);
      if (Number.isFinite(lastRead) && now - lastRead < ACTIVE_CHAT_WINDOW_MS) {
        return json(200, { tokenCount: 0, sent: 0, failed: 0, suppressed: true, reason: 'user_active' });
      }
    }
    // admin -> thread owner
    recipientUserIds = [thread.user_id];
  }

  if (recipientUserIds.length === 0) {
    return json(200, { tokenCount: 0, sent: 0, failed: 0 });
  }

  let senderDisplayName = msg.sender_role === 'admin' ? 'VinylHead' : 'Хэрэглэгч';
  let senderAvatarUrl = '';
  if (msg.sender_user_id) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', msg.sender_user_id)
      .maybeSingle();
    if (profile?.full_name?.trim()) {
      senderDisplayName = profile.full_name.trim();
    }
    if (profile?.avatar_url?.trim()) {
      senderAvatarUrl = profile.avatar_url.trim();
    }
  }

  const { data: tokens, error: tokenErr } = await supabaseAdmin
    .from('expo_push_tokens')
    .select('token')
    .in('user_id', recipientUserIds);
  if (tokenErr) return json(500, { error: 'Failed to load tokens' });

  const uniqueTokens = [
    ...new Set((tokens ?? []).map((t) => (t.token ?? '').trim()).filter(Boolean)),
  ];

  const title = senderDisplayName;
  const body =
    (msg.text && msg.text.trim()) ? msg.text.trim() : (msg.image_url ? 'Зураг' : 'Шинэ мессеж');

  const pushData: Record<string, string> = {
    type: 'chat',
    threadId,
    messageId,
    senderRole: String(msg.sender_role),
    senderName: senderDisplayName,
    senderAvatarUrl,
  };

  if (msg.sender_role === 'user') {
    pushData.recipientRole = 'admin';
  } else {
    pushData.recipientUserId = thread.user_id;
  }

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

