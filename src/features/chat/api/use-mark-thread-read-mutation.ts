import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { chatKeys } from './chat-keys';

export type MarkThreadReadInput = {
  threadId: string;
  role: 'user' | 'admin';
  userIdForInvalidation?: string;
};

export function useMarkThreadReadMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: MarkThreadReadInput) => {
      const threadId = input.threadId.trim();
      if (!threadId) throw new Error('Missing thread id');

      const patch =
        input.role === 'admin'
          ? { admin_last_read_at: new Date().toISOString() }
          : { user_last_read_at: new Date().toISOString() };

      const { error } = await supabase.from('chat_threads').update(patch).eq('id', threadId);
      if (error) throw error;
      return { ok: true };
    },
    onSuccess: async (_data, input) => {
      await qc.invalidateQueries({ queryKey: chatKeys.messages(input.threadId) });
      if (input.userIdForInvalidation) {
        await qc.invalidateQueries({ queryKey: chatKeys.thread(input.userIdForInvalidation) });
      }
    },
  });
}

