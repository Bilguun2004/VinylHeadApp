import { ThumbsUp } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import type { ProductReviewWithDetails } from '../api/use-product-reviews-query';
import { formatReviewDate } from '../lib/format-review-date';
import { reviewInitial } from '../lib/review-stats';
import { ReviewImagePreviewModal } from './review-image-preview-modal';
import { StarRating } from './star-rating';

type ReviewCardProps = {
  review: ProductReviewWithDetails;
  currentUserId?: string;
  onToggleLike: (review: ProductReviewWithDetails) => void;
  likePending?: boolean;
};

export function ReviewCard({
  review,
  currentUserId,
  onToggleLike,
  likePending = false,
}: ReviewCardProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const displayName = review.author_display_name?.trim() || 'Хэрэглэгч';
  const initial = reviewInitial(review.author_display_name);
  const avatarUrl = review.author_avatar_url?.trim() || null;
  const sortedImages = [...review.images].sort((a, b) => a.sort_order - b.sort_order);
  const canLike = Boolean(currentUserId);

  return (
    <View className="rounded-2xl bg-white px-4 py-4 shadow-sm">
      <View className="flex-row items-start">
        <View className="h-10 w-10 overflow-hidden items-center justify-center rounded-full bg-vinyl-divider">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              className="h-10 w-10"
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Text className="text-sm font-semibold text-vinyl-black">{initial}</Text>
          )}
        </View>

        <View className="ml-3 flex-1">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-base font-semibold text-vinyl-black">{displayName}</Text>
              <Text className="mt-0.5 text-xs text-vinyl-muted">
                {formatReviewDate(review.created_at)}
              </Text>
            </View>
            <StarRating rating={review.rating} size={14} />
          </View>

          <Text className="mt-3 text-sm leading-6 text-vinyl-black">{review.comment}</Text>

          {sortedImages.length > 0 ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {sortedImages.map((img) => (
                <Pressable
                  key={img.id}
                  onPress={() => setPreviewUrl(img.image_url)}
                  accessibilityRole="button"
                  accessibilityLabel="Зургийг томруулах"
                >
                  <Image
                    source={{ uri: img.image_url }}
                    className="h-20 w-20 rounded-xl"
                    resizeMode="cover"
                  />
                </Pressable>
              ))}
            </View>
          ) : null}

          <Pressable
            onPress={() => onToggleLike(review)}
            disabled={!canLike || likePending}
            accessibilityRole="button"
            accessibilityLabel="Хэрэгтэй"
            accessibilityState={{ disabled: !canLike || likePending }}
            className={`mt-4 flex-row items-center self-start rounded-full border px-3 py-1.5 ${
              review.likedByMe
                ? 'border-vinyl-black bg-vinyl-black'
                : 'border-vinyl-divider bg-white'
            }`}
          >
            <ThumbsUp
              size={14}
              color={review.likedByMe ? '#FFFFFF' : '#0A0A0A'}
            />
            <Text
              className={`ml-1.5 text-xs font-medium ${
                review.likedByMe ? 'text-white' : 'text-vinyl-black'
              }`}
            >
              {review.likeCount > 0
                ? `Хэрэгтэй (${review.likeCount})`
                : 'Хэрэгтэй'}
            </Text>
          </Pressable>
        </View>
      </View>

      <ReviewImagePreviewModal
        imageUrl={previewUrl}
        visible={Boolean(previewUrl)}
        onClose={() => setPreviewUrl(null)}
      />
    </View>
  );
}
