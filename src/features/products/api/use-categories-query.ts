import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import type { Tables } from '../../../types/supabase';

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

  // #region agent log
  fetch('http://127.0.0.1:7510/ingest/a1c0ba24-a96d-4e59-b6ea-bd3612f69b5f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'344e2f'},body:JSON.stringify({sessionId:'344e2f',runId:'pre-fix',hypothesisId:'H2',location:'src/features/products/api/use-categories-query.ts:fetchHomeNavCategories',message:'Fetched home nav categories',data:{count:(data??[]).length,firstIds:(data??[]).slice(0,4).map(r=>String(r.id)),seedLike:(data??[]).slice(0,4).some(r=>String(r.id).startsWith('11111111-1111'))},timestamp:Date.now()})}).catch(()=>{});
  // eslint-disable-next-line no-console
  console.log('[debug-344e2f][H2] categories', {
    count: (data ?? []).length,
    firstIds: (data ?? []).slice(0, 6).map((r) => String(r.id)),
    seedLike: (data ?? []).some((r) => String(r.id).startsWith('11111111-1111')),
  });
  // #endregion

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
