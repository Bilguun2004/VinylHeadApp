import type { User } from '@supabase/supabase-js';

import { supabase } from '../../../lib/supabase';

function displayNameFromUser(user: User): string | null {
  const meta = user.user_metadata;
  const candidates = [
    meta?.display_name,
    meta?.full_name,
    [meta?.given_name, meta?.family_name].filter(Boolean).join(' '),
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/**
 * Ensures public.profiles has a row for the signed-in user.
 * The DB trigger usually creates this on auth.users INSERT, but social
 * sign-in can succeed even when the trigger is missing or out of date.
 */
export async function ensureAuthUserProfile(user: User): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (readError) throw readError;

  const fullName = displayNameFromUser(user);
  const phone =
    typeof user.user_metadata?.phone_number === 'string'
      ? user.user_metadata.phone_number.trim() || null
      : null;

  if (existing) {
    if (!fullName || existing.full_name?.trim()) {
      return;
    }
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);
    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase.from('profiles').insert({
    id: user.id,
    full_name: fullName,
    phone_number: phone,
  });
  if (insertError) throw insertError;
}
