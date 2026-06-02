import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { chatKeys } from './chat-keys';

export type ChatMessageRow = {
  id: string;
  thread_id: string;
  sender_user_id: string | null;
  sender_role: 'user' | 'admin';
  text: string | null;
  image_url: string | null;
  created_at: string;
};

async function fetchMessages(threadId: string): Promise<ChatMessageRow[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChatMessageRow[];
}

export function useChatMessagesQuery(threadId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: threadId ? chatKeys.messages(threadId) : [...chatKeys.all, 'messages', { threadId: null }],
    queryFn: async () => {
      if (!threadId) throw new Error('Missing thread id');
      return await fetchMessages(threadId);
    },
    enabled: (options?.enabled ?? true) && Boolean(threadId),
  });
}

