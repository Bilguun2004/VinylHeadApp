import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { chatKeys } from './chat-keys';

export type ProfileSearchItem = {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
};

async function searchProfiles(search: string): Promise<ProfileSearchItem[]> {
  const trimmed = search.trim();
  if (!trimmed) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,phone_number,avatar_url')
    .ilike('full_name', `%${trimmed}%`)
    .order('updated_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as ProfileSearchItem[];
}

export function useProfileSearchQuery(search: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: chatKeys.profileSearch(search),
    queryFn: () => searchProfiles(search),
    enabled: (options?.enabled ?? true) && search.trim().length > 0,
  });
}

