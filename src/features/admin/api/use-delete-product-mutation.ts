import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { deleteProductStorageImages } from '../lib/delete-product-storage-images';
import { adminProductKeys } from './use-admin-products-query';
import { productKeys } from '../../products/api/use-product-query';

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('id, image_url, specs, product_options')
        .eq('id', productId)
        .single();

      if (fetchError) throw fetchError;

      await deleteProductStorageImages(product);

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: async (_data, productId) => {
      const detailKey = productKeys.detail(productId);

      await queryClient.cancelQueries({ queryKey: detailKey });
      queryClient.removeQueries({ queryKey: detailKey });

      await queryClient.invalidateQueries({
        queryKey: productKeys.all,
        predicate: (query) => query.queryKey[1] !== 'detail',
      });
      await queryClient.invalidateQueries({ queryKey: adminProductKeys.all });
    },
  });
}
