export function getPrivacyPolicyUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim();
  return url || null;
}
