import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import {
  productKeys,
  productWithCategorySelect,
  type ProductWithCategory,
} from './use-product-query';

function sanitizeSearchTerm(raw: string): string {
  return raw
    .trim()
    .replace(/[%_,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchProductSearch(search: string): Promise<ProductWithCategory[]> {
  const term = sanitizeSearchTerm(search);

  let q = supabase
    .from('products')
    .select(productWithCategorySelect)
    .order('created_at', { ascending: false });

  if (term.length > 0) {
    const p = `%${term}%`;
    q = q.or(`title.ilike.${p},artist.ilike.${p}`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ProductWithCategory[];
}

export function useProductSearchQuery(
  search: string,
  options?: { enabled?: boolean },
) {
  const term = sanitizeSearchTerm(search);

  return useQuery({
    queryKey: productKeys.search(term),
    queryFn: () => fetchProductSearch(search),
    enabled: (options?.enabled ?? true) && term.length > 0,
  });
}
