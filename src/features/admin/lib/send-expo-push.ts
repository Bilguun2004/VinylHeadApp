type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
};

type ExpoPushTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function sendExpoPushBatch(
  messages: ExpoPushMessage[],
): Promise<{ sent: number; failed: number }> {
  if (messages.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const accessToken = process.env.EXPO_PUBLIC_EXPO_ACCESS_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
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
      throw new Error(text || 'Push илгээхэд алдаа гарлаа.');
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
