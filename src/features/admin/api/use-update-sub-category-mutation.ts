import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { categoryKeys } from '../../products/api/use-categories-query';
import { adminCategoryKeys } from './use-admin-categories-query';
import { adminSubCategoryKeys } from './use-admin-sub-categories-query';

export function useUpdateSubCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const trimmed = input.name.trim();
      if (!trimmed) throw new Error('Нэр хоосон байна.');

      const { error } = await supabase
        .from('sub_categories')
        .update({ name: trimmed })
        .eq('id', input.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      await queryClient.invalidateQueries({ queryKey: adminCategoryKeys.all });
      await queryClient.invalidateQueries({ queryKey: adminSubCategoryKeys.all });
    },
  });
}
