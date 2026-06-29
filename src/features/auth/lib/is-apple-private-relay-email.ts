const APPLE_PRIVATE_RELAY_SUFFIX = '@privaterelay.appleid.com';

export function isApplePrivateRelayEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(APPLE_PRIVATE_RELAY_SUFFIX);
}
