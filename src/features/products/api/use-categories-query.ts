import { useQuery } from '@tanstack/react-query';

import { SALE_CATEGORY_ID } from '../../../lib/catalog-seed-ids';
import { supabase } from '../../../lib/supabase';
import type { Tables } from '../../../types/supabase';

export const SALE_CATEGORY_NAME = 'Хямдрал';

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
  homeNav: () => [...categoryKeys.all, 'home-nav'] as const,
};

export type CategoryRow = Tables<'categories'>;
export type SubCategoryRow = Tables<'sub_categories'>;

export type CategoryWithSubcategories = CategoryRow & {
  sub_categories: SubCategoryRow[];
};

async function fetchCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function fetchHomeNavCategories(): Promise<CategoryWithSubcategories[]> {
  const { data, error } = await supabase
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

  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...row,
    sub_categories: [...(row.sub_categories ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    ),
  }));
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: categoryKeys.list(),
    queryFn: fetchCategories,
  });
}

export function useHomeNavCategoriesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: categoryKeys.homeNav(),
    queryFn: fetchHomeNavCategories,
    enabled: options?.enabled ?? true,
  });
}

const SYNTHETIC_SALE_CATEGORY: CategoryWithSubcategories = {
  id: SALE_CATEGORY_ID,
  name: SALE_CATEGORY_NAME,
  icon: null,
  sort_order: Number.MAX_SAFE_INTEGER,
  created_at: '1970-01-01T00:00:00.000Z',
  updated_at: '1970-01-01T00:00:00.000Z',
  sub_categories: [],
};

export function withSaleCategory(
  categories: CategoryWithSubcategories[],
  includeSale: boolean,
): CategoryWithSubcategories[] {
  if (!includeSale) return categories;
  return [...categories, SYNTHETIC_SALE_CATEGORY];
}
