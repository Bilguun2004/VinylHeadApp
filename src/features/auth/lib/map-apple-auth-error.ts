const MESSAGES = {
  providerDisabled:
    'Apple нэвтрэлт Supabase дээр идэвхжээгүй байна. npm run apple:apply ажиллуулна уу.',
  invalidClient:
    'Apple Client ID тохиргоо буруу байна. Bundle ID (com.vinylhead.app) болон Expo Go (host.exp.Exponent) Supabase Apple provider-д бүртгэгдсэн эсэхийг шалгана уу.',
  generic: 'Apple-ээр нэвтэрч чадсангүй. Дахин оролдоно уу.',
};

export function mapAppleAuthError(err: unknown): string {
  if (!(err instanceof Error)) return MESSAGES.generic;
  const msg = err.message.toLowerCase();

  if (
    msg.includes('provider') &&
    (msg.includes('disabled') || msg.includes('not enabled'))
  ) {
    return MESSAGES.providerDisabled;
  }
  if (
    msg.includes('unauthorized') ||
    msg.includes('invalid client') ||
    msg.includes('audience') ||
    msg.includes('id_token')
  ) {
    return MESSAGES.invalidClient;
  }

  return err.message || MESSAGES.generic;
}
