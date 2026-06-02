import { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  View,
  useWindowDimensions,
} from 'react-native';

type ProductImageCarouselProps = {
  title: string;
  imageUrls: string[];
  fallbackUri: string;
};

export function ProductImageCarousel({
  title,
  imageUrls,
  fallbackUri,
}: ProductImageCarouselProps) {
  const { width } = useWindowDimensions();
  const imageWidth = width;
  const urls = useMemo(
    () => (imageUrls.length > 0 ? imageUrls : [fallbackUri]),
    [fallbackUri, imageUrls],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / imageWidth);
    if (index !== activeIndex && index >= 0 && index < urls.length) {
      setActiveIndex(index);
    }
  };

  const imageHeight = 320;

  return (
    <View className="overflow-hidden bg-white">
      <FlatList
        data={urls}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ height: imageHeight }}
        contentContainerStyle={{ height: imageHeight }}
        getItemLayout={(_, index) => ({
          length: imageWidth,
          offset: imageWidth * index,
          index,
        })}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={{ width: imageWidth, height: imageHeight }}
            resizeMode="cover"
            accessibilityLabel={title}
          />
        )}
      />

      <View className="bg-vinyl-surface pb-3 pt-3 flex-row items-center justify-center">
        {urls.map((uri, i) => (
          <View
            key={`${uri}-dot-${i}`}
            className={`h-2 w-2 rounded-full ${
              i === activeIndex ? 'bg-vinyl-black' : 'bg-vinyl-divider'
            } ${i > 0 ? 'ml-2' : ''}`}
          />
        ))}
      </View>
    </View>
  );
}
