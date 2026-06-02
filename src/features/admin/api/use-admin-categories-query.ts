import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import type { CategoryRow } from '../../products/api/use-categories-query';

export const adminCategoryKeys = {
  all: ['admin', 'categories'] as const,
  list: () => [...adminCategoryKeys.all, 'list'] as const,
};

export type AdminCategoryRow = CategoryRow & {
  product_count: number;
};

async function fetchAdminCategories(): Promise<AdminCategoryRow[]> {
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (catError) throw catError;
  const rows = categories ?? [];

  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('category_id');

  if (prodError) throw prodError;

  const countByCategory = new Map<string, number>();
  for (const p of products ?? []) {
    const cid = p.category_id;
    if (cid == null) continue;
    countByCategory.set(cid, (countByCategory.get(cid) ?? 0) + 1);
  }

  return rows.map((c) => ({
    ...c,
    product_count: countByCategory.get(c.id) ?? 0,
  }));
}

export function useAdminCategoriesQuery() {
  return useQuery({
    queryKey: adminCategoryKeys.list(),
    queryFn: fetchAdminCategories,
  });
}
