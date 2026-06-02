import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthSessionQuery } from '../../auth/api/use-auth-session-query';
import { useProfileQuery } from '../../profile/api/use-profile-query';
import { useCanReviewProductQuery } from '../api/use-can-review-product-query';
import type { ProductReviewWithDetails } from '../api/use-product-reviews-query';
import { useProductReviewsQuery } from '../api/use-product-reviews-query';
import { useToggleReviewLikeMutation } from '../api/use-toggle-review-like-mutation';
import { ReviewCard } from '../components/review-card';
import { ReviewSummaryCard } from '../components/review-summary-card';
import { WriteReviewSheet } from '../components/write-review-sheet';
import { computeReviewSummary } from '../lib/review-stats';

export function ProductReviewsScreen() {
  const router = useRouter();
  const { id: productId } = useLocalSearchParams<{ id: string }>();
  const pid = productId?.trim() ?? '';

  const sessionQuery = useAuthSessionQuery();
  const userId = sessionQuery.data?.user.id;

  const profileQuery = useProfileQuery(userId);
  const reviewsQuery = useProductReviewsQuery(pid, userId);
  const canReviewQuery = useCanReviewProductQuery(pid, userId);
  const toggleLikeMutation = useToggleReviewLikeMutation();

  const [writeOpen, setWriteOpen] = useState(false);
  const [likingReviewId, setLikingReviewId] = useState<string | null>(null);

  const reviews = reviewsQuery.data ?? [];
  const summary = computeReviewSummary(reviews);

  const authorName =
    profileQuery.data?.full_name?.trim() ||
    sessionQuery.data?.user.user_metadata?.display_name?.trim() ||
    'Хэрэглэгч';
  const authorAvatarUrl = profileQuery.data?.avatar_url?.trim() || null;

  const handleToggleLike = (review: ProductReviewWithDetails) => {
    if (!userId || !pid) {
      Alert.alert('Нэвтрэх', 'Сэтгэгдэлд лайк хийхийн тулд нэвтэрнэ үү.');
      return;
    }
    setLikingReviewId(review.id);
    toggleLikeMutation.mutate(
      {
        productId: pid,
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
    <SafeAreaView className="flex-1 bg-vinyl-surface" edges={['top']}>
      <View className="flex-row items-center border-b border-vinyl-divider bg-white px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Буцах"
          hitSlop={8}
          className="h-10 w-10 items-center justify-center"
        >
          <ArrowLeft size={22} color="#0A0A0A" />
        </Pressable>
        <Text className="ml-2 text-lg font-semibold text-vinyl-black">Сэтгэгдэл</Text>
      </View>

      {reviewsQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : reviewsQuery.isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm text-vinyl-muted">
            Сэтгэгдэл ачаалж чадсангүй.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-8 pt-4"
          showsVerticalScrollIndicator={false}
        >
          <ReviewSummaryCard summary={summary} />

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
            {reviews.length === 0 ? (
              <Text className="py-8 text-center text-sm text-vinyl-muted">
                Сэтгэгдэл байхгүй байна.
              </Text>
            ) : (
              reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  currentUserId={userId}
                  onToggleLike={handleToggleLike}
                  likePending={likingReviewId === review.id}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}

      {pid && userId ? (
        <WriteReviewSheet
          visible={writeOpen}
          productId={pid}
          userId={userId}
          authorDisplayName={authorName}
          authorAvatarUrl={authorAvatarUrl}
          onClose={() => setWriteOpen(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}
