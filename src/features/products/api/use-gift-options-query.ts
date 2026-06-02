import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import type { Tables } from '../../../types/supabase';

export const giftOptionKeys = {
  all: ['gift-options'] as const,
  available: () => [...giftOptionKeys.all, 'available'] as const,
};

export type GiftOptionRow = Tables<'gift_options'>;

async function fetchAvailableGiftOptions(): Promise<GiftOptionRow[]> {
  const { data, error } = await supabase
    .from('gift_options')
    .select('*')
    .eq('is_available', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export function useGiftOptionsQuery() {
  return useQuery({
    queryKey: giftOptionKeys.available(),
    queryFn: fetchAvailableGiftOptions,
  });
}
