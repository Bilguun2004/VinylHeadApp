import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { authSessionKeys } from './use-auth-session-query';

async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function useSignOutMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationKey: ['auth', 'sign-out'],
    mutationFn: signOut,
    onSuccess: () => {
      qc.setQueryData(authSessionKeys.session, null);
    },
  });
}
