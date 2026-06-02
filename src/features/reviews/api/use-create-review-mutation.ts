import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { uploadReviewImageFromUri } from '../lib/upload-review-image';
import { reviewKeys } from './review-keys';

const MAX_REVIEW_IMAGES = 3;

export type CreateReviewInput = {
  productId: string;
  userId: string;
  authorDisplayName: string;
  authorAvatarUrl?: string | null;
  rating: number;
  comment: string;
  localImageUris?: string[];
};

export function useCreateReviewMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReviewInput) => {
      const productId = input.productId.trim();
      const userId = input.userId.trim();
      if (!productId || !userId) throw new Error('Missing product or user id');

      const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
      const comment = input.comment.trim();
      if (!comment) throw new Error('Сэтгэгдэл бичнэ үү.');

      const imageUris = (input.localImageUris ?? []).slice(0, MAX_REVIEW_IMAGES);

      const { data: review, error: insertError } = await supabase
        .from('product_reviews')
        .insert({
          product_id: productId,
          user_id: userId,
          rating,
          comment,
          author_display_name: input.authorDisplayName.trim() || null,
          author_avatar_url: input.authorAvatarUrl?.trim() || null,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      const reviewId = review.id;
      const imageRows: { review_id: string; image_url: string; sort_order: number }[] =
        [];

      for (let i = 0; i < imageUris.length; i++) {
        const uri = imageUris[i]!;
        const imageUrl = await uploadReviewImageFromUri({
          localUri: uri,
          userId,
          reviewId,
        });
        imageRows.push({
          review_id: reviewId,
          image_url: imageUrl,
          sort_order: i,
        });
      }

      if (imageRows.length > 0) {
        const { error: imagesError } = await supabase
          .from('product_review_images')
          .insert(imageRows);
        if (imagesError) throw imagesError;
      }

      return { reviewId };
    },
    onSuccess: async (_data, input) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: reviewKeys.byProduct(input.productId) }),
        qc.invalidateQueries({
          queryKey: reviewKeys.canReview(input.productId, input.userId),
        }),
      ]);
    },
  });
}
