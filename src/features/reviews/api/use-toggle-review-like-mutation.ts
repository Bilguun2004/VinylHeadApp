import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { reviewKeys } from './review-keys';

export type ToggleReviewLikeInput = {
  productId: string;
  reviewId: string;
  userId: string;
  liked: boolean;
};

export function useToggleReviewLikeMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: ToggleReviewLikeInput) => {
      const { reviewId, userId, liked } = input;
      if (liked) {
        const { error } = await supabase
          .from('product_review_likes')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_review_likes')
          .insert({ review_id: reviewId, user_id: userId });
        if (error) throw error;
      }
      return { ok: true };
    },
    onSuccess: async (_data, input) => {
      await qc.invalidateQueries({
        queryKey: reviewKeys.byProduct(input.productId),
      });
    },
  });
}
