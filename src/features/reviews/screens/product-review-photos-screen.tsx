import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthSessionQuery } from '../../auth/api/use-auth-session-query';
import { useProductReviewsQuery } from '../api/use-product-reviews-query';
import { ReviewImagePreviewModal } from '../components/review-image-preview-modal';
import { flattenReviewPhotos } from '../lib/review-stats';

export function ProductReviewPhotosScreen() {
  const router = useRouter();
  const { id: productId } = useLocalSearchParams<{ id: string }>();
  const pid = productId?.trim() ?? '';
  const { width } = useWindowDimensions();
  const gap = 8;
  const numColumns = 3;
  const tileSize = (width - 32 - gap * (numColumns - 1)) / numColumns;

  const sessionQuery = useAuthSessionQuery();
  const userId = sessionQuery.data?.user.id;
  const reviewsQuery = useProductReviewsQuery(pid, userId);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const photos = useMemo(
    () => flattenReviewPhotos(reviewsQuery.data ?? []),
    [reviewsQuery.data],
  );

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
        <Text className="ml-2 text-lg font-semibold text-vinyl-black">Зургаар харах</Text>
      </View>

      {reviewsQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : photos.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-sm text-vinyl-muted">Зураг байхгүй байна.</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          contentContainerClassName="p-4"
          columnWrapperStyle={{ gap }}
          ItemSeparatorComponent={() => <View style={{ height: gap }} />}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setPreviewUrl(item.imageUrl)}
              accessibilityRole="button"
              accessibilityLabel="Зургийг томруулах"
            >
              <Image
                source={{ uri: item.imageUrl }}
                style={{ width: tileSize, height: tileSize, borderRadius: 12 }}
                resizeMode="cover"
              />
            </Pressable>
          )}
        />
      )}

      <ReviewImagePreviewModal
        imageUrl={previewUrl}
        visible={Boolean(previewUrl)}
        onClose={() => setPreviewUrl(null)}
      />
    </SafeAreaView>
  );
}
