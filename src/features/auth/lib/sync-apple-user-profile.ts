import type { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';

import { supabase } from '../../../lib/supabase';
import { ensureAuthUserProfile } from './ensure-auth-user-profile';
import { isApplePrivateRelayEmail } from './is-apple-private-relay-email';

type AppleNameParts = {
  givenName?: string | null;
  familyName?: string | null;
  middleName?: string | null;
};

function buildFullName(parts: AppleNameParts): string {
  return [parts.givenName, parts.middleName, parts.familyName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ')
    .trim();
}

function metadataFromAppleName(parts: AppleNameParts): Record<string, string> {
  const fullName = buildFullName(parts);
  const data: Record<string, string> = {};
  if (fullName) data.display_name = fullName;
  if (parts.givenName?.trim()) data.given_name = parts.givenName.trim();
  if (parts.familyName?.trim()) data.family_name = parts.familyName.trim();
  return data;
}

export async function syncAppleCredentialProfile(
  credential: AppleAuthentication.AppleAuthenticationCredential,
  session: Session,
): Promise<void> {
  const user = session.user;
  const email = user.email ?? credential.email ?? null;
  const usesPrivateRelay = isApplePrivateRelayEmail(email);

  const nameMeta = credential.fullName
    ? metadataFromAppleName({
        givenName: credential.fullName.givenName,
        middleName: credential.fullName.middleName,
        familyName: credential.fullName.familyName,
      })
    : {};

  const userMeta: Record<string, string | boolean> = {
    ...nameMeta,
    auth_provider: 'apple',
    uses_private_relay_email: usesPrivateRelay,
  };

  if (Object.keys(userMeta).length > 0) {
    const { error: updateError } = await supabase.auth.updateUser({
      data: userMeta,
    });
    if (updateError) throw updateError;
  }

  await ensureAuthUserProfile({
    ...user,
    user_metadata: {
      ...user.user_metadata,
      ...userMeta,
    },
  });

  const fullName = nameMeta.display_name;
  if (fullName) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id)
      .is('full_name', null);
    if (profileError) throw profileError;
  }
}

export async function syncAppleOAuthUserProfile(user: User): Promise<void> {
  const email = user.email;
  const usesPrivateRelay = isApplePrivateRelayEmail(email);

  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      auth_provider: 'apple',
      uses_private_relay_email: usesPrivateRelay,
    },
  });
  if (updateError) throw updateError;

  await ensureAuthUserProfile(user);
}
