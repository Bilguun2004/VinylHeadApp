import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { chatKeys } from './chat-keys';

export type ToggleFollowUpInput = {
  threadId: string;
  next: boolean;
};

export function useToggleFollowUpMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: ToggleFollowUpInput) => {
      const { error } = await supabase
        .from('chat_threads')
        .update({ is_follow_up: input.next })
        .eq('id', input.threadId);
      if (error) throw error;
      return { ok: true };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: chatKeys.all });
    },
  });
}

