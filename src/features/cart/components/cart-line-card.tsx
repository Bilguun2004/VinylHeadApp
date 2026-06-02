import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { Alert, Image, Pressable, Text, View } from 'react-native';

import { lineItemTotal } from '../lib/cart-pricing';
import { formatMnt } from '../lib/format-mnt';
import type { CartLineItem } from '../types/cart-line-item';
import { CartQuantityStepper } from './cart-quantity-stepper';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1560507074-b9eb43a0c9a4?auto=format&fit=crop&w=400&q=80';

const FALLBACK_WRAP_SWATCH =
  'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=80&q=80';

type CartLineCardProps = {
  line: CartLineItem;
  onRemove: (lineId: string) => void;
  onQuantityChange: (lineId: string, quantity: number) => void;
};

export function CartLineCard({
  line,
  onRemove,
  onQuantityChange,
}: CartLineCardProps) {
  const router = useRouter();
  const imageUri = line.imageUrl?.trim() || FALLBACK_IMAGE;
  const lineTotal = lineItemTotal(line);
  const giftSwatch =
    line.giftOptionImageUrl?.trim() || FALLBACK_WRAP_SWATCH;

  const confirmRemove = () => {
    Alert.alert('Устгах уу?', `${line.title} сагснаас хасах уу?`, [
      { text: 'Цуцлах', style: 'cancel' },
      {
        text: 'Устгах',
        style: 'destructive',
        onPress: () => onRemove(line.lineId),
      },
    ]);
  };

  const openProduct = () => {
    router.push({
      pathname: '/product/[id]',
      params: { id: line.productId, lineId: line.lineId },
    });
  };

  return (
    <View className="relative mb-3 overflow-hidden rounded-2xl bg-white p-3">
      <Pressable
        onPress={confirmRemove}
        accessibilityRole="button"
        accessibilityLabel={`${line.title} устгах`}
        hitSlop={8}
        className="absolute right-2 top-2 z-10 h-8 w-8 items-center justify-center"
      >
        <X size={18} color="#6B6B6B" strokeWidth={2} />
      </Pressable>

      <Pressable
        onPress={openProduct}
        accessibilityRole="button"
        accessibilityLabel={`${line.title} дэлгэрэнгүй`}
        className="flex-row pr-6"
      >
        <Image
          source={{ uri: imageUri }}
          className="h-20 w-20 rounded-xl"
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
        <View className="ml-3 flex-1">
          <Text
            className="font-serif text-base font-semibold text-vinyl-black"
            numberOfLines={1}
          >
            {line.title}
          </Text>
          <Text className="mt-0.5 text-xs leading-4 text-vinyl-muted" numberOfLines={2}>
            {line.subtitle}
          </Text>

          {line.productOptionLabel ? (
            <View className="mt-2 self-start rounded-full bg-vinyl-surface px-2 py-1">
              <Text className="text-[10px] text-vinyl-muted">
                Сонголт: {line.productOptionLabel}
              </Text>
            </View>
          ) : null}

          {line.giftOptionId != null && line.giftOptionName ? (
            <View className="mt-2 flex-row items-center self-start rounded-full bg-vinyl-surface px-2 py-1">
              <Image
                source={{ uri: giftSwatch }}
                className="mr-1.5 h-3 w-3 rounded-full"
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
              <Text className="text-[10px] text-vinyl-muted">
                Бэлгийн боодол ({line.giftOptionName})
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <View className="mt-3 flex-row items-center justify-between pl-[92px] pr-1">
        <Pressable
          onPress={openProduct}
          accessibilityRole="button"
          accessibilityLabel={`${line.title} үнэ`}
        >
          <Text className="text-base font-bold text-vinyl-black">
            {formatMnt(lineTotal)}
          </Text>
        </Pressable>
        <CartQuantityStepper
          value={line.quantity}
          onChange={(qty) => onQuantityChange(line.lineId, qty)}
        />
      </View>
    </View>
  );
}
