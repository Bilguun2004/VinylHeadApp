import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { reviewKeys } from './review-keys';

const REVIEW_SELECT = `
  id,
  product_id,
  user_id,
  rating,
  comment,
  author_display_name,
  author_avatar_url,
  created_at,
  product_review_images ( id, image_url, sort_order ),
  product_review_likes ( user_id )
`;

type ReviewImageRow = {
  id: string;
  image_url: string;
  sort_order: number;
};

type ReviewLikeRow = {
  user_id: string;
};

type ReviewRow = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  created_at: string;
  product_review_images: ReviewImageRow[] | null;
  product_review_likes: ReviewLikeRow[] | null;
};

export type ProductReviewWithDetails = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  created_at: string;
  images: { id: string; image_url: string; sort_order: number }[];
  like_user_ids: string[];
  likeCount: number;
  likedByMe: boolean;
};

function mapReview(
  row: ReviewRow,
  avatarByUserId: Map<string, string | null>,
  currentUserId?: string,
): ProductReviewWithDetails {
  const images = row.product_review_images ?? [];
  const likeUserIds = (row.product_review_likes ?? []).map((l) => l.user_id);
  const liveAvatar = avatarByUserId.get(row.user_id) ?? null;
  const authorAvatarUrl =
    liveAvatar?.trim() || row.author_avatar_url?.trim() || null;

  return {
    id: row.id,
    product_id: row.product_id,
    user_id: row.user_id,
    rating: row.rating,
    comment: row.comment,
    author_display_name: row.author_display_name,
    author_avatar_url: authorAvatarUrl,
    created_at: row.created_at,
    images,
    like_user_ids: likeUserIds,
    likeCount: likeUserIds.length,
    likedByMe: Boolean(currentUserId && likeUserIds.includes(currentUserId)),
  };
}

async function fetchProductReviews(
  productId: string,
  currentUserId?: string,
): Promise<ProductReviewWithDetails[]> {
  const { data, error } = await supabase
    .from('product_reviews')
    .select(REVIEW_SELECT)
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as ReviewRow[];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const avatarByUserId = new Map<string, string | null>();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', userIds);

    if (profilesError) throw profilesError;
    for (const p of profiles ?? []) {
      avatarByUserId.set(p.id, p.avatar_url);
    }
  }

  return rows.map((row) => mapReview(row, avatarByUserId, currentUserId));
}

export function useProductReviewsQuery(
  productId: string | undefined,
  currentUserId?: string,
) {
  const id = productId?.trim() ?? '';
  return useQuery({
    queryKey: reviewKeys.byProduct(id),
    queryFn: () => fetchProductReviews(id, currentUserId),
    enabled: id.length > 0,
  });
}
