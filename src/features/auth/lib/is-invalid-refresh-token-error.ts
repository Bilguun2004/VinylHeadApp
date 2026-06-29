import type { AuthError } from '@supabase/supabase-js';

function messageMatches(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('invalid refresh token') ||
    lower.includes('refresh token not found') ||
    lower.includes('session not found')
  );
}

export function isInvalidRefreshTokenError(
  error: AuthError | null | undefined,
): boolean {
  if (!error?.message) return false;
  return messageMatches(error.message);
}

export function isInvalidRefreshTokenMessage(message: string): boolean {
  return messageMatches(message);
}
