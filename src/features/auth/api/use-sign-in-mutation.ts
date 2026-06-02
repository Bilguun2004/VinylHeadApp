import { useMutation } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../../../lib/supabase';

export type SignInArgs = {
  email: string;
  password: string;
};

async function signInWithPassword({
  email,
  password,
}: SignInArgs): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  // supabase-js returns null for `session` when MFA is required; we don't
  // support that yet, so treat it as a hard error so the screen surfaces it.
  if (!data.session) {
    throw new Error('Сесс үүсгэж чадсангүй. Та дахин оролдоно уу.');
  }
  return data.session;
}

export function useSignInMutation() {
  return useMutation({
    mutationKey: ['auth', 'sign-in', 'password'],
    mutationFn: signInWithPassword,
  });
}
