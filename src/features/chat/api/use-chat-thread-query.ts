import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { chatKeys } from './chat-keys';

export type ChatThreadRow = {
  id: string;
  user_id: string;
  is_follow_up: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  user_last_read_at: string | null;
  admin_last_read_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchOrCreateChatThread(userId: string): Promise<ChatThreadRow> {
  const { data: existing, error: selectError } = await supabase
    .from('chat_threads')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing as ChatThreadRow;

  const { data: created, error: insertError } = await supabase
    .from('chat_threads')
    .insert({ user_id: userId })
    .select('*')
    .single();
  if (insertError) throw insertError;
  return created as ChatThreadRow;
}

export type ChatThreadWithProfile = ChatThreadRow & {
  profiles: {
    full_name: string | null;
    phone_number: string | null;
    avatar_url: string | null;
  } | null;
};

export async function fetchChatThreadById(
  threadId: string,
): Promise<ChatThreadWithProfile | null> {
  const { data, error } = await supabase
    .from('chat_threads')
    .select(
      'id,user_id,is_follow_up,last_message_at,last_message_preview,user_last_read_at,admin_last_read_at,created_at,updated_at,profiles(full_name,phone_number,avatar_url)',
    )
    .eq('id', threadId)
    .maybeSingle();
  if (error) throw error;
  return (data as ChatThreadWithProfile | null) ?? null;
}

export function useChatThreadQuery(userId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: userId ? chatKeys.thread(userId) : [...chatKeys.all, 'thread', { userId: null }],
    queryFn: async () => {
      if (!userId) throw new Error('Missing user id');
      return await fetchOrCreateChatThread(userId);
    },
    enabled: (options?.enabled ?? true) && Boolean(userId),
  });
}

