import { useMutation } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '../../../lib/supabase';

export type SignUpArgs = {
  username: string;
  phoneNumber: string;
  email: string;
  password: string;
};

// `needsEmailConfirmation` flips to true when the Supabase project has
// "Confirm email" enabled — supabase-js returns a `user` but no `session`,
// and the screen needs to tell the user to check their inbox instead of
// navigating into the app.
export type SignUpResult =
  | { needsEmailConfirmation: true; user: User }
  | { needsEmailConfirmation: false; session: Session; user: User };

async function signUpWithPassword({
  username,
  phoneNumber,
  email,
  password,
}: SignUpArgs): Promise<SignUpResult> {
  const displayName = username.trim();
  const phone = phoneNumber.trim();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName || null,
        phone_number: phone || null,
      },
    },
  });
  if (error) throw error;
  if (!data.user) {
    throw new Error('Бүртгэл үүсгэж чадсангүй. Та дахин оролдоно уу.');
  }

  if (!data.session) {
    return { needsEmailConfirmation: true, user: data.user };
  }
  return {
    needsEmailConfirmation: false,
    session: data.session,
    user: data.user,
  };
}

export function useSignUpMutation() {
  return useMutation({
    mutationKey: ['auth', 'sign-up', 'password'],
    mutationFn: signUpWithPassword,
  });
}
