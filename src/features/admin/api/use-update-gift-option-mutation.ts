import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { adminGiftOptionKeys } from './use-admin-gift-options-query';

export type UpdateGiftOptionInput = {
  id: string;
  is_available?: boolean;
};

export function useUpdateGiftOptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateGiftOptionInput) => {
      const patch: { is_available?: boolean } = {};
      if (input.is_available !== undefined) {
        patch.is_available = input.is_available;
      }

      const { error } = await supabase
        .from('gift_options')
        .update(patch)
        .eq('id', input.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminGiftOptionKeys.all });
    },
  });
}
