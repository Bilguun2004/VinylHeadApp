import { useMutation } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { supabase } from '../../../lib/supabase';

export type ForgotPasswordArgs = {
  email: string;
};

function getPasswordResetRedirectUrl(): string | undefined {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/reset-password`;
  }
  if (Platform.OS === 'web') return undefined;
  return Linking.createURL('reset-password');
}

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
