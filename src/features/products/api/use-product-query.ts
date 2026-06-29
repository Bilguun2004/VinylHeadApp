import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import type { Tables } from '../../../types/supabase';

export type ProductRow = Tables<'products'>;

export type ProductWithCategory = ProductRow & {
  categories: Pick<Tables<'categories'>, 'id' | 'name'> | null;
};

export const productKeys = {
  all: ['products'] as const,
  list: (categoryId: string | null, subCategoryId: string | null = null) =>
    [...productKeys.all, 'list', { categoryId, subCategoryId }] as const,
  search: (term: string) => [...productKeys.all, 'search', { term }] as const,
  sale: () => [...productKeys.all, 'sale'] as const,
  detail: (id: string) => [...productKeys.all, 'detail', { id }] as const,
};

export const productWithCategorySelect = `
  id,
  category_id,
  sub_category_id,
  title,
  artist,
  description,
  price,
  discount_price,
  image_url,
  specs,
  is_laser_printing_enabled,
  is_featured,
  available,
  options_enabled,
  options_label,
  product_options,
  created_at,
  updated_at,
  categories ( id, name )
`;

async function fetchProductById(id: string): Promise<ProductWithCategory> {
  const { data, error } = await supabase
    .from('products')
    .select(productWithCategorySelect)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as ProductWithCategory;
}

export function useProductQuery(productId: string) {
  return useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: () => fetchProductById(productId),
    enabled: productId.trim().length > 0,
  });
}
