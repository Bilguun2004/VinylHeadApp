import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { partitionSaleProducts } from '../lib/product-sale';
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
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (categoryId) {
    q = q.eq('category_id', categoryId);
  }
  if (subCategoryId) {
    q = q.eq('sub_category_id', subCategoryId);
  }

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []) as ProductWithCategory[];
}

export type SaleProductsQueryData = {
  products: ProductWithCategory[];
  showTab: boolean;
};

async function fetchSaleProducts(): Promise<SaleProductsQueryData> {
  const { data, error } = await supabase
    .from('products')
    .select(productWithCategorySelect)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as ProductWithCategory[];
  const { products, showTab } = partitionSaleProducts(rows);

  return { products, showTab };
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

export function useSaleProductsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: productKeys.sale(),
    queryFn: fetchSaleProducts,
    enabled: options?.enabled ?? true,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
