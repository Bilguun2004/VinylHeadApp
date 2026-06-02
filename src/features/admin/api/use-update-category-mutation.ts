import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { adminCategoryKeys } from './use-admin-categories-query';
import { adminProductKeys } from './use-admin-products-query';
import { categoryKeys } from '../../products/api/use-categories-query';
import { productKeys } from '../../products/api/use-product-query';

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const trimmed = input.name.trim();
      if (trimmed.length === 0) {
        throw new Error('Нэр хоосон байна.');
      }

      const { error } = await supabase
        .from('categories')
        .update({ name: trimmed })
        .eq('id', input.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      await queryClient.invalidateQueries({ queryKey: adminCategoryKeys.all });
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
      await queryClient.invalidateQueries({ queryKey: adminProductKeys.all });
    },
  });
}
