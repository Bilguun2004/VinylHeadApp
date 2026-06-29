import { supabase } from '../../../lib/supabase';
import { unregisterPushTokenForUser } from './register-push-token';

export async function deleteAccountWithCleanup(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Нэвтрээгүй байна.');
  }

  const userId = session.user.id;
  try {
    await unregisterPushTokenForUser(userId);
  } catch {
    // Best-effort cleanup before the account is removed server-side.
  }

  const { data, error } = await supabase.functions.invoke('delete-account');

  if (error) {
    throw error;
  }

  const payload = data as { error?: string } | null;
  if (payload?.error) {
    throw new Error(payload.error);
  }

  await supabase.auth.signOut({ scope: 'local' });
}
