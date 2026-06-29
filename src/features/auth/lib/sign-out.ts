import { supabase } from '../../../lib/supabase';
import { unregisterPushTokenForUser } from './register-push-token';

/** Signs out and removes this device's push token for the current user. */
export async function signOutWithCleanup(): Promise<void> {
  // Use the locally cached session (no network) so a dead/expired session
  // can't block sign-out. Token cleanup is best-effort.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userId = session?.user.id;
  if (userId) {
    try {
      await unregisterPushTokenForUser(userId);
    } catch {
      // Ignore: cleanup must never prevent the user from signing out.
    }
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
