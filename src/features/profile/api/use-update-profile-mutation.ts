import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { authSessionKeys } from '../../auth/api/use-auth-session-query';
import { profileKeys } from './use-profile-query';

export type UpdateProfileInput = {
  userId: string;
  fullName: string;
  phoneNumber: string;
};

export function useUpdateProfileMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const userId = input.userId.trim();
      if (!userId) throw new Error('Missing user id');

      const fullName = input.fullName.trim();
      const phoneNumber = input.phoneNumber.trim();

      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName || null,
          phone_number: phoneNumber || null,
        })
        .eq('id', userId);
      if (updateProfileError) throw updateProfileError;

      const { error: updateAuthError } = await supabase.auth.updateUser({
        data: {
          display_name: fullName || null,
          phone_number: phoneNumber || null,
        },
      });
      if (updateAuthError) throw updateAuthError;

      return { ok: true };
    },
    onSuccess: async (_data, input) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: profileKeys.detail(input.userId) }),
        qc.invalidateQueries({ queryKey: authSessionKeys.session }),
      ]);
    },
  });
}

