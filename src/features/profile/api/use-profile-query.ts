import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import type { Tables } from '../../../types/supabase';

export const profileKeys = {
  all: ['profiles'] as const,
  detail: (userId: string) => [...profileKeys.all, 'detail', { userId }] as const,
};

export type ProfileRow = Tables<'profiles'>;

async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function useProfileQuery(userId: string | undefined) {
  const id = userId?.trim() ?? '';
  return useQuery({
    queryKey: profileKeys.detail(id),
    queryFn: () => fetchProfile(id),
    enabled: id.length > 0,
  });
}
