import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';

import { signInWithBiometric } from '../lib/biometric-auth';
import { authSessionKeys } from './use-auth-session-query';

export function useBiometricSignInMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['auth', 'sign-in', 'biometric'],
    mutationFn: signInWithBiometric,
    onSuccess: (session) => {
      queryClient.setQueryData(authSessionKeys.session, session);
      void queryClient.invalidateQueries({ queryKey: authSessionKeys.session });
    },
  });
}

export type { Session };
