import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { adminCategoryKeys } from './use-admin-categories-query';
import { categoryKeys } from '../../products/api/use-categories-query';

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (trimmed.length === 0) {
        throw new Error('Нэр хоосон байна.');
      }

      const { data: last, error: maxError } = await supabase
        .from('categories')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxError) throw maxError;

      const nextSortOrder = (last?.sort_order ?? -1) + 1;

      const { error } = await supabase.from('categories').insert({
        name: trimmed,
        icon: null,
        sort_order: nextSortOrder,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      await queryClient.invalidateQueries({ queryKey: adminCategoryKeys.all });
    },
  });
}
