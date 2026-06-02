import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import {
  customerNameFromOrder,
  formatOrderDateTime,
  primaryOrderItem,
  productLineSubtitle,
  type AdminOrderWithDetails,
} from '../../admin/api/use-admin-orders-query';
import {
  normalizeOrderStatus,
  statusLabelMn,
} from '../../admin/lib/order-status';

const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1560507074-b9eb43a0c9a4?auto=format&fit=crop&w=400&q=80';

function PaymentMethodMark({ method }: { method: string | null }) {
  const m = method?.trim().toLowerCase() ?? '';
  if (m === 'qpay') {
    return (
      <View className="h-8 w-8 items-center justify-center rounded-md bg-[#2B6BE6]">
        <Text className="text-sm font-bold text-white">Q</Text>
      </View>
    );
  }
  if (m === 'storepay') {
    return (
      <View className="h-8 items-center justify-center rounded-md bg-vinyl-black px-1.5">
        <Text className="text-[9px] font-bold lowercase text-white">storepay</Text>
      </View>
    );
  }
  return null;
}

function StatusBadge({ status }: { status: string }) {
  const kind = normalizeOrderStatus(status);
  const label = statusLabelMn(status);

  if (kind === 'delivered') {
    return (
      <View className="rounded-full bg-vinyl-surface px-3 py-1">
        <Text className="text-xs font-semibold text-vinyl-muted">{label}</Text>
      </View>
    );
  }

  if (kind === 'confirmed') {
    return (
      <View className="rounded-full bg-vinyl-black px-3 py-1">
        <Text className="text-xs font-semibold text-vinyl-paper">{label}</Text>
      </View>
    );
  }

  return (
    <View className="rounded-full border border-vinyl-divider bg-white px-3 py-1">
      <Text className="text-xs font-semibold text-vinyl-muted">{label}</Text>
    </View>
  );
}

type OrderCardProps = {
  order: AdminOrderWithDetails;
  onOpen: (order: AdminOrderWithDetails) => void;
  onToggleDelivered?: (order: AdminOrderWithDetails) => void;
  toggleBusy?: boolean;
};

export function OrderCard({
  order,
  onOpen,
  onToggleDelivered,
  toggleBusy = false,
}: OrderCardProps) {
  const item = primaryOrderItem(order);
  const product = item?.products;
  const imageUri = product?.image_url?.trim() || FALLBACK_PRODUCT_IMAGE;
  const isDelivered = normalizeOrderStatus(order.status) === 'delivered';
  const productTitle = product?.title ?? 'Бүтээгдэхүүн';
  const productMeta =
    product?.description?.trim() ||
    productLineSubtitle(item) ||
    productTitle;

  return (
    <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
      <Pressable
        onPress={() => onOpen(order)}
        accessibilityRole="button"
        accessibilityLabel={`Захиалга ${order.order_number} дэлгэрэнгүй`}
      >
        <View className="flex-row items-start justify-between">
          <Text className="text-xs font-medium text-vinyl-muted">
            #{order.order_number}
          </Text>
          <StatusBadge status={order.status} />
        </View>

        <View className="mt-3 flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="font-serif text-xl font-semibold text-vinyl-black">
              {customerNameFromOrder(order)}
            </Text>
            <Text className="mt-1 text-sm text-vinyl-muted">
              {formatOrderDateTime(order.created_at)}
            </Text>
          </View>
          <PaymentMethodMark method={order.payment_method} />
        </View>

        <View className="mt-4 flex-row rounded-xl bg-vinyl-surface p-3">
          <Image
            source={{ uri: imageUri }}
            className="h-16 w-16 rounded-lg"
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
          <View className="ml-3 flex-1 justify-center">
            <Text
              className="text-sm font-semibold text-vinyl-black"
              numberOfLines={2}
            >
              {productTitle}
            </Text>
            <Text className="mt-1 text-xs text-vinyl-muted" numberOfLines={2}>
              {productMeta}
            </Text>
            {order.order_items.length > 1 ? (
              <Text className="mt-1 text-xs font-semibold text-vinyl-black">
                +{order.order_items.length - 1} бусад бараа · Дэлгэрэнгүй
              </Text>
            ) : (
              <Text className="mt-1 text-xs text-vinyl-muted">Дэлгэрэнгүй →</Text>
            )}
          </View>
        </View>
      </Pressable>

      {onToggleDelivered ? (
        <Pressable
          onPress={() => onToggleDelivered(order)}
          disabled={toggleBusy}
          accessibilityRole="button"
          accessibilityLabel={
            isDelivered
              ? 'Баталгаажсан болгох'
              : 'Хүргэгдсэн гэж тэмдэглэх'
          }
          className={`mt-4 h-12 items-center justify-center rounded-xl ${
            isDelivered ? 'border border-vinyl-black bg-white' : 'bg-vinyl-black'
          }`}
        >
          {toggleBusy ? (
            <ActivityIndicator color={isDelivered ? '#0A0A0A' : '#FFFFFF'} />
          ) : (
            <Text
              className={`text-sm font-semibold ${
                isDelivered ? 'text-vinyl-black' : 'text-vinyl-paper'
              }`}
            >
              {isDelivered
                ? 'Баталгаажсан болгох'
                : 'Хүргэгдсэн гэж тэмдэглэх'}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}
