import { supabase } from '../../../lib/supabase';

function parseHashParams(url: string): URLSearchParams | null {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return null;
  return new URLSearchParams(url.slice(hashIndex + 1));
}

export type CreateSessionResult =
  | { ok: true }
  | { ok: false; error: string | null };

export async function createSessionFromUrl(
  url: string,
): Promise<CreateSessionResult> {
  try {
    const parsed = new URL(url);
    const code = parsed.searchParams.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return { ok: true };
    }

    const hashParams = parseHashParams(url);
    const accessToken = hashParams?.get('access_token');
    const refreshToken = hashParams?.get('refresh_token');
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      return { ok: true };
    }

    // No recovery token in the URL: not necessarily an error (e.g. the screen
    // was opened directly), so let the caller fall back to an existing session.
    return { ok: false, error: null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : null,
    };
  }
}
