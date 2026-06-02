import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

type ReviewPhoto = {
  id: string;
  imageUrl: string;
};

type ReviewPhotoStripProps = {
  productId: string;
  photos: ReviewPhoto[];
  onPhotoPress: (imageUrl: string) => void;
};

export function ReviewPhotoStrip({
  productId,
  photos,
  onPhotoPress,
}: ReviewPhotoStripProps) {
  const router = useRouter();

  if (photos.length === 0) return null;

  return (
    <View className="mt-6">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-vinyl-black">Зургаар харах</Text>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/product/[id]/review-photos',
              params: { id: productId },
            })
          }
          accessibilityRole="link"
          accessibilityLabel="Бүгдийг харах"
          hitSlop={8}
        >
          <Text className="text-sm font-medium text-blue-600">Бүгдийг харах</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-3"
        contentContainerStyle={{ gap: 10 }}
      >
        {photos.map((photo) => (
          <Pressable
            key={photo.id}
            onPress={() => onPhotoPress(photo.imageUrl)}
            accessibilityRole="button"
            accessibilityLabel="Сэтгэгдлийн зураг"
          >
            <Image
              source={{ uri: photo.imageUrl }}
              className="h-[72px] w-[72px] rounded-xl"
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
