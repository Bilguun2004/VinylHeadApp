import type { AuthError } from '@supabase/supabase-js';

import { supabase } from '../../../lib/supabase';
import { clearBiometricLogin } from './biometric-auth';
import { isInvalidRefreshTokenError } from './is-invalid-refresh-token-error';

/** Clears a persisted session whose refresh token Auth no longer accepts. */
export async function recoverStaleAuthSession(
  error: AuthError | null | undefined,
): Promise<boolean> {
  if (!isInvalidRefreshTokenError(error)) return false;

  await supabase.auth.signOut({ scope: 'local' });
  await clearBiometricLogin();
  return true;
}
