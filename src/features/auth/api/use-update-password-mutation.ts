import { useMutation } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';

export type UpdatePasswordArgs = {
  password: string;
};

async function updatePassword({ password }: UpdatePasswordArgs): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export function useUpdatePasswordMutation() {
  return useMutation({
    mutationKey: ['auth', 'update-password'],
    mutationFn: updatePassword,
  });
}
