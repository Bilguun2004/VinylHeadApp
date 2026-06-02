import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import { useAuthSessionQuery } from '../../auth/api/use-auth-session-query';
import { useProfileQuery } from '../../profile/api/use-profile-query';
import { useCanReviewProductQuery } from '../api/use-can-review-product-query';
import type { ProductReviewWithDetails } from '../api/use-product-reviews-query';
import { useProductReviewsQuery } from '../api/use-product-reviews-query';
import { useToggleReviewLikeMutation } from '../api/use-toggle-review-like-mutation';
import {
  computeReviewSummary,
  flattenReviewPhotos,
} from '../lib/review-stats';
import { ReviewCard } from './review-card';
import { ReviewImagePreviewModal } from './review-image-preview-modal';
import { ReviewPhotoStrip } from './review-photo-strip';
import { ReviewSummaryCard } from './review-summary-card';
import { WriteReviewSheet } from './write-review-sheet';

const PREVIEW_COUNT = 2;

type ProductReviewsSectionProps = {
  productId: string;
};

export function ProductReviewsSection({ productId }: ProductReviewsSectionProps) {
  const router = useRouter();
  const sessionQuery = useAuthSessionQuery();
  const userId = sessionQuery.data?.user.id;

  const profileQuery = useProfileQuery(userId);
  const reviewsQuery = useProductReviewsQuery(productId, userId);
  const canReviewQuery = useCanReviewProductQuery(productId, userId);
  const toggleLikeMutation = useToggleReviewLikeMutation();

  const [writeOpen, setWriteOpen] = useState(false);
  const [stripPreviewUrl, setStripPreviewUrl] = useState<string | null>(null);
  const [likingReviewId, setLikingReviewId] = useState<string | null>(null);

  const reviews = reviewsQuery.data ?? [];
  const summary = useMemo(() => computeReviewSummary(reviews), [reviews]);
  const photos = useMemo(() => flattenReviewPhotos(reviews), [reviews]);
  const previewReviews = reviews.slice(0, PREVIEW_COUNT);

  const authorName =
    profileQuery.data?.full_name?.trim() ||
    sessionQuery.data?.user.user_metadata?.display_name?.trim() ||
    'Хэрэглэгч';
  const authorAvatarUrl = profileQuery.data?.avatar_url?.trim() || null;

  const handleToggleLike = (review: ProductReviewWithDetails) => {
    if (!userId) {
      Alert.alert('Нэвтрэх', 'Сэтгэгдэлд лайк хийхийн тулд нэвтэрнэ үү.');
      return;
    }
    setLikingReviewId(review.id);
    toggleLikeMutation.mutate(
      {
        productId,
        reviewId: review.id,
        userId,
        liked: review.likedByMe,
      },
      {
        onSettled: () => setLikingReviewId(null),
        onError: (err) => {
          const message =
            err instanceof Error ? err.message : 'Алдаа гарлаа.';
          Alert.alert('Алдаа', message);
        },
      },
    );
  };

  return (
    <View className="mt-2 pb-4">
      <Text className="mb-4 font-serif text-2xl font-semibold text-vinyl-black">
        Сэтгэгдэл
      </Text>

      {reviewsQuery.isPending ? (
        <View className="items-center py-10">
          <ActivityIndicator />
        </View>
      ) : reviewsQuery.isError ? (
        <Text className="text-center text-sm text-vinyl-muted">
          Сэтгэгдэл ачаалж чадсангүй.
        </Text>
      ) : (
        <>
          <ReviewSummaryCard summary={summary} />

          <ReviewPhotoStrip
            productId={productId}
            photos={photos}
            onPhotoPress={setStripPreviewUrl}
          />

          {canReviewQuery.data ? (
            <Pressable
              onPress={() => setWriteOpen(true)}
              className="mt-4 h-11 items-center justify-center rounded-2xl bg-vinyl-black"
              accessibilityRole="button"
              accessibilityLabel="Сэтгэгдэл бичих"
            >
              <Text className="text-sm font-semibold text-white">Сэтгэгдэл бичих</Text>
            </Pressable>
          ) : null}

          <View className="mt-4 gap-3">
            {previewReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                currentUserId={userId}
                onToggleLike={handleToggleLike}
                likePending={likingReviewId === review.id}
              />
            ))}
          </View>

          {reviews.length > 0 ? (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/product/[id]/reviews',
                  params: { id: productId },
                })
              }
              className="mt-4 h-12 items-center justify-center rounded-2xl border border-vinyl-divider bg-white"
              accessibilityRole="button"
              accessibilityLabel="Бүх сэтгэгдлийг харах"
            >
              <Text className="text-sm font-medium text-vinyl-black">
                Бүх сэтгэгдлийг харах
              </Text>
            </Pressable>
          ) : null}
        </>
      )}

      <WriteReviewSheet
        visible={writeOpen}
        productId={productId}
        userId={userId ?? ''}
        authorDisplayName={authorName}
        authorAvatarUrl={authorAvatarUrl}
        onClose={() => setWriteOpen(false)}
      />

      <ReviewImagePreviewModal
        imageUrl={stripPreviewUrl}
        visible={Boolean(stripPreviewUrl)}
        onClose={() => setStripPreviewUrl(null)}
      />
    </View>
  );
}
