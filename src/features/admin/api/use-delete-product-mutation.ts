import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { adminProductKeys } from './use-admin-products-query';
import { productKeys } from '../../products/api/use-product-query';

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
    },
    onSuccess: async (_data, productId) => {
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
      await queryClient.invalidateQueries({ queryKey: adminProductKeys.all });
      await queryClient.removeQueries({ queryKey: productKeys.detail(productId) });
    },
  });
}
