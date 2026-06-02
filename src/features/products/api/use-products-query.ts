import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import {
  productKeys,
  productWithCategorySelect,
  type ProductWithCategory,
} from './use-product-query';

async function fetchProductsByCategory(
  categoryId: string | null,
  subCategoryId: string | null,
): Promise<ProductWithCategory[]> {
  let q = supabase
    .from('products')
    .select(productWithCategorySelect)
    .order('created_at', {
      ascending: false,
    });

  if (categoryId) {
    q = q.eq('category_id', categoryId);
  }
  if (subCategoryId) {
    q = q.eq('sub_category_id', subCategoryId);
  }

  const { data, error } = await q;
  if (error) throw error;

  // #region agent log
  fetch('http://127.0.0.1:7510/ingest/a1c0ba24-a96d-4e59-b6ea-bd3612f69b5f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'344e2f'},body:JSON.stringify({sessionId:'344e2f',runId:'pre-fix',hypothesisId:'H3',location:'src/features/products/api/use-products-query.ts:fetchProductsByCategory',message:'Fetched products',data:{categoryId,subCategoryId,count:(data??[]).length,firstIds:(data??[]).slice(0,4).map(r=>String(r.id)),seedLike:(data??[]).slice(0,4).some(r=>String(r.id).startsWith('22222222-2222'))},timestamp:Date.now()})}).catch(()=>{});
  // eslint-disable-next-line no-console
  console.log('[debug-344e2f][H3] products', {
    categoryId,
    subCategoryId,
    count: (data ?? []).length,
    firstIds: (data ?? []).slice(0, 6).map((r) => String(r.id)),
    seedLike: (data ?? []).some((r) => String(r.id).startsWith('22222222-2222')),
  });
  // #endregion

  return (data ?? []) as ProductWithCategory[];
}

export function useProductsQuery(
  categoryId: string | null,
  subCategoryId: string | null = null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: productKeys.list(categoryId, subCategoryId),
    queryFn: () => fetchProductsByCategory(categoryId, subCategoryId),
    enabled: options?.enabled ?? true,
  });
}
