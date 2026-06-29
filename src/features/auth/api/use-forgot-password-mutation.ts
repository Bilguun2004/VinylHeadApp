import { useMutation } from '@tanstack/react-query';

import { getPasswordResetRedirectUrl } from '../lib/get-auth-redirect-url';
import { supabase } from '../../../lib/supabase';

export type ForgotPasswordArgs = {
  email: string;
};

async function sendPasswordResetEmail({
  email,
}: ForgotPasswordArgs): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordResetRedirectUrl(),
  });
  if (error) throw error;
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationKey: ['auth', 'forgot-password'],
    mutationFn: sendPasswordResetEmail,
  });
}
