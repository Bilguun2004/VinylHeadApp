import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { sortProductsByAvailabilityAndPrice } from '../lib/product-sale';
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
    .order('available', { ascending: false })
    .order('price', { ascending: true });

  if (term.length > 0) {
    const p = `%${term}%`;
    q = q.or(`title.ilike.${p},artist.ilike.${p}`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return sortProductsByAvailabilityAndPrice(
    (data ?? []) as ProductWithCategory[],
  );
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
