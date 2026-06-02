import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import {
  productWithCategorySelect,
  type ProductWithCategory,
} from '../../products/api/use-product-query';

export const adminProductKeys = {
  all: ['admin', 'products'] as const,
  list: (search: string) => [...adminProductKeys.all, 'list', { search }] as const,
};

async function fetchAdminProducts(search: string): Promise<ProductWithCategory[]> {
  const term = search.trim().replace(/[%_,]/g, ' ').replace(/\s+/g, ' ').trim();

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

export function useAdminProductsQuery(search: string) {
  return useQuery({
    queryKey: adminProductKeys.list(search),
    queryFn: () => fetchAdminProducts(search),
  });
}
