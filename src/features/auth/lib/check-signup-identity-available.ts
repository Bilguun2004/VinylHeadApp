import { supabase } from '../../../lib/supabase';

export type SignupIdentityAvailability = {
  emailTaken: boolean;
  phoneTaken: boolean;
};

export async function checkSignupIdentityAvailable(
  email: string,
  phoneNumber: string,
): Promise<SignupIdentityAvailability> {
  const { data, error } = await supabase.rpc('check_signup_identity_available', {
    p_email: email.trim(),
    p_phone_number: phoneNumber.trim(),
  });

  if (error) throw error;

  const result = data as { email_taken?: boolean; phone_taken?: boolean } | null;
  return {
    emailTaken: result?.email_taken === true,
    phoneTaken: result?.phone_taken === true,
  };
}
