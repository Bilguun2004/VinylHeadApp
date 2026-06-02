import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../types/supabase';

export const adminGiftOptionKeys = {
  all: ['admin', 'gift-options'] as const,
  list: () => [...adminGiftOptionKeys.all, 'list'] as const,
};

export type AdminGiftOptionRow = Database['public']['Tables']['gift_options']['Row'];

async function fetchAdminGiftOptions(): Promise<AdminGiftOptionRow[]> {
  const { data, error } = await supabase
    .from('gift_options')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export function useAdminGiftOptionsQuery() {
  return useQuery({
    queryKey: adminGiftOptionKeys.list(),
    queryFn: fetchAdminGiftOptions,
  });
}
