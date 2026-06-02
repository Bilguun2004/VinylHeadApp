import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { categoryKeys } from '../../products/api/use-categories-query';
import { productKeys } from '../../products/api/use-product-query';
import { adminCategoryKeys } from './use-admin-categories-query';
import { adminSubCategoryKeys } from './use-admin-sub-categories-query';

export function useDeleteSubCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subCategoryId: string) => {
      const { error } = await supabase
        .from('sub_categories')
        .delete()
        .eq('id', subCategoryId);

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      await queryClient.invalidateQueries({ queryKey: adminCategoryKeys.all });
      await queryClient.invalidateQueries({ queryKey: adminSubCategoryKeys.all });
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
