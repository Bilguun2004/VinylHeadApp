import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { buildAdminUnreadCounts } from '../lib/admin-thread-unread';
import { chatKeys } from './chat-keys';

export type AdminChatThreadItem = {
  id: string;
  user_id: string;
  is_follow_up: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  user_last_read_at: string | null;
  admin_last_read_at: string | null;
  profiles: { full_name: string | null; phone_number: string | null; avatar_url: string | null } | null;
};

export type AdminChatThreadListItem = AdminChatThreadItem & {
  unread_count: number;
};

async function fetchAdminThreads(): Promise<AdminChatThreadListItem[]> {
  const { data, error } = await supabase
    .from('chat_threads')
    .select(
      'id,user_id,is_follow_up,last_message_at,last_message_preview,user_last_read_at,admin_last_read_at,profiles(full_name,phone_number,avatar_url)',
    )
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) throw error;

  const threads = (data ?? []) as AdminChatThreadItem[];
  if (threads.length === 0) return [];

  const threadIds = threads.map((thread) => thread.id);
  const { data: userMessages, error: messagesError } = await supabase
    .from('chat_messages')
    .select('thread_id, created_at')
    .in('thread_id', threadIds)
    .eq('sender_role', 'user');

  if (messagesError) throw messagesError;

  const unreadCounts = buildAdminUnreadCounts(threads, userMessages ?? []);

  return threads.map((thread) => ({
    ...thread,
    unread_count: unreadCounts[thread.id] ?? 0,
  }));
}

export function useAdminChatThreadsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: chatKeys.adminThreads(''),
    queryFn: fetchAdminThreads,
    enabled: options?.enabled ?? true,
  });
}

