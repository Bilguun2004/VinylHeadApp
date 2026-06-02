import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { categoryKeys } from '../../products/api/use-categories-query';
import { adminCategoryKeys } from './use-admin-categories-query';
import { adminSubCategoryKeys } from './use-admin-sub-categories-query';

export type CreateSubCategoryInput = {
  categoryId: string;
  name: string;
};

export function useCreateSubCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSubCategoryInput) => {
      const trimmed = input.name.trim();
      if (!trimmed) throw new Error('Нэр хоосон байна.');

      const { data: last, error: maxError } = await supabase
        .from('sub_categories')
        .select('sort_order')
        .eq('category_id', input.categoryId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxError) throw maxError;

      const nextSort = (last?.sort_order ?? -1) + 1;

      const { error } = await supabase.from('sub_categories').insert({
        category_id: input.categoryId,
        name: trimmed,
        sort_order: nextSort,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      await queryClient.invalidateQueries({ queryKey: adminCategoryKeys.all });
      await queryClient.invalidateQueries({ queryKey: adminSubCategoryKeys.all });
    },
  });
}
