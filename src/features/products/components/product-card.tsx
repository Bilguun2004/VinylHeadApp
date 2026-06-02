import { Image, Pressable, Text, View } from 'react-native';

import type { ProductWithCategory } from '../api/use-product-query';

export function formatMnt(amount: number) {
  return `₮${Math.round(amount).toLocaleString('en-US')}`;
}

export function productSubtitle(product: ProductWithCategory) {
  const cat = product.categories?.name ?? '';
  if (cat && product.artist) return `${cat} • ${product.artist}`;
  return cat || product.artist || '';
}

export function isOnSale(product: ProductWithCategory) {
  const list = Number(product.price);
  const discount =
    product.discount_price != null ? Number(product.discount_price) : null;
  return discount != null && !Number.isNaN(discount) && discount < list;
}

export function isProductAvailable(product: ProductWithCategory) {
  return product.available !== false;
}

type ProductCardProps = {
  product: ProductWithCategory;
  width: number;
  onPress: (productId: string) => void;
  onLongPress?: (product: ProductWithCategory) => void;
  showAvailability?: boolean;
};

export function ProductCard({
  product,
  width,
  onPress,
  onLongPress,
  showAvailability = false,
}: ProductCardProps) {
  const sale = isOnSale(product);
  const available = isProductAvailable(product);
  const list = Number(product.price);
  const display =
    sale && product.discount_price != null
      ? Number(product.discount_price)
      : list;

  const imageUri = product.image_url?.trim() ?? '';

  return (
    <Pressable
      onPress={() => onPress(product.id)}
      onLongPress={onLongPress ? () => onLongPress(product) : undefined}
      accessibilityRole="button"
      accessibilityLabel={product.title}
      className="overflow-hidden rounded-2xl bg-white"
      style={{ width }}
    >
      <View className="relative">
        <Image
          source={{
            uri:
              imageUri ||
              'https://images.unsplash.com/photo-1560507074-b9eb43a0c9a4?auto=format&fit=crop&w=1200&q=80',
          }}
          style={{ width: '100%', height: width }}
          resizeMode="cover"
          accessibilityLabel={product.title}
        />
        {showAvailability && !available ? (
          <View className="absolute left-3 top-3 rounded-md bg-vinyl-muted px-2 py-1">
            <Text className="text-[10px] font-semibold text-vinyl-paper">
              Нөөц дууссан
            </Text>
          </View>
        ) : sale ? (
          <View className="absolute left-3 top-3 rounded-md bg-red-600 px-2 py-1">
            <Text className="text-[10px] font-semibold text-vinyl-paper">
              Хямдралтай
            </Text>
          </View>
        ) : null}
      </View>

      <View className="px-3 pb-3 pt-2">
        <Text className="text-xs text-vinyl-muted" numberOfLines={1}>
          {productSubtitle(product)}
        </Text>
        <Text
          className="mt-1 text-sm font-semibold text-vinyl-black"
          numberOfLines={1}
        >
          {product.title}
        </Text>
        <View className="mt-2 flex-row items-center">
          <Text
            className={`text-sm font-semibold ${
              sale ? 'text-red-600' : 'text-vinyl-black'
            }`}
          >
            {formatMnt(display)}
          </Text>
          {sale ? (
            <Text className="ml-2 text-xs text-vinyl-muted line-through">
              {formatMnt(list)}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
