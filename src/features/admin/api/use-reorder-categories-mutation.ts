import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { adminCategoryKeys } from './use-admin-categories-query';
import { adminSubCategoryKeys } from './use-admin-sub-categories-query';
import { categoryKeys } from '../../products/api/use-categories-query';

export function useReorderCategoriesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const results = await Promise.all(
        orderedIds.map((id, index) =>
          supabase.from('categories').update({ sort_order: index }).eq('id', id),
        ),
      );

      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      await queryClient.invalidateQueries({ queryKey: adminCategoryKeys.all });
      await queryClient.invalidateQueries({ queryKey: adminSubCategoryKeys.all });
    },
  });
}
