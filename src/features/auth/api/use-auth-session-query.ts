import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { useAuthReady } from '../context/auth-ready-context';
import { recoverStaleAuthSession } from '../lib/recover-stale-auth-session';

export const authSessionKeys = {
  session: ['auth', 'session'] as const,
};

function isAdminFromSession(session: Session | null): boolean {
  const role = session?.user.app_metadata?.role;
  return role === 'admin';
}

export function useAuthSessionQuery() {
  const authReady = useAuthReady();

  return useQuery({
    queryKey: authSessionKeys.session,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (await recoverStaleAuthSession(error)) return null;
      if (error) throw error;
      return data.session;
    },
    enabled: authReady,
    staleTime: 30_000,
  });
}

export function useIsAdmin(): boolean {
  const q = useAuthSessionQuery();
  return isAdminFromSession(q.data ?? null);
}
