import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import type { Tables } from '../../../types/supabase';
import type { CategoryRow } from '../../products/api/use-categories-query';

export const adminSubCategoryKeys = {
  all: ['admin', 'sub-categories'] as const,
  tree: () => [...adminSubCategoryKeys.all, 'tree'] as const,
};

export type SubCategoryRow = Tables<'sub_categories'>;

export type AdminCategoryWithSubs = CategoryRow & {
  sub_categories: SubCategoryRow[];
  product_count: number;
};

async function fetchAdminCategoryTree(): Promise<AdminCategoryWithSubs[]> {
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select(
      `
      *,
      sub_categories (
        id,
        category_id,
        name,
        sort_order,
        created_at,
        updated_at
      )
    `,
    )
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
    .order('sort_order', {
      ascending: true,
      referencedTable: 'sub_categories',
    });

  if (catError) throw catError;

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

  return (categories ?? []).map((row) => {
    const subs = [...(row.sub_categories ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
    return {
      ...row,
      sub_categories: subs,
      product_count: countByCategory.get(row.id) ?? 0,
    };
  });
}

export function useAdminCategoryTreeQuery() {
  return useQuery({
    queryKey: adminSubCategoryKeys.tree(),
    queryFn: fetchAdminCategoryTree,
  });
}
