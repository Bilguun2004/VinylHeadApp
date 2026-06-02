import { supabase } from '../../../lib/supabase';

function parseHashParams(url: string): URLSearchParams | null {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return null;
  return new URLSearchParams(url.slice(hashIndex + 1));
}

export async function createSessionFromUrl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const code = parsed.searchParams.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return true;
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
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
