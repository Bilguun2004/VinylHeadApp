import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { uploadProfileAvatarFromUri } from '../lib/upload-profile-avatar';
import { profileKeys } from './use-profile-query';

export type UploadProfileAvatarInput = {
  userId: string;
  localUri: string;
};

export function useUploadProfileAvatarMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: UploadProfileAvatarInput) => {
      const userId = input.userId.trim();
      if (!userId) throw new Error('Missing user id');

      const avatarUrl = await uploadProfileAvatarFromUri({
        localUri: input.localUri,
        userId,
      });

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);
      if (error) throw error;

      return { avatarUrl };
    },
    onSuccess: async (_data, input) => {
      await qc.invalidateQueries({ queryKey: profileKeys.detail(input.userId) });
    },
  });
}
