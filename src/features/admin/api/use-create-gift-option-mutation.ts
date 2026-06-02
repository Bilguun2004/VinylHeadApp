import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { uploadProductImageFromUri } from '../lib/upload-product-image';
import { adminGiftOptionKeys } from './use-admin-gift-options-query';

export type CreateGiftOptionInput = {
  name: string;
  localImageUri?: string;
  ownerUserId: string;
};

export function useCreateGiftOptionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateGiftOptionInput) => {
      const trimmed = input.name.trim();
      if (trimmed.length === 0) {
        throw new Error('Нэр хоосон байна.');
      }

      let image_url: string | null = null;
      if (input.localImageUri?.trim()) {
        image_url = await uploadProductImageFromUri({
          localUri: input.localImageUri,
          ownerUserId: input.ownerUserId,
        });
      }

      const { error } = await supabase.from('gift_options').insert({
        name: trimmed,
        price: 0,
        image_url,
        is_available: true,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminGiftOptionKeys.all });
    },
  });
}
