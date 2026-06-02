import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Download,
  Gift,
  MapPin,
  Phone,
  Printer,
  User,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMnt } from '../../cart/lib/format-mnt';
import {
  customerNameFromOrder,
  customerPhoneFromOrder,
  deliveryAddressLines,
  formatOrderDateTime,
  giftWrapImageUrl,
  productLineSubtitle,
  type AdminOrderItemRow,
  type AdminOrderWithDetails,
} from '../../admin/api/use-admin-orders-query';
import { useUpdateOrderStatusMutation } from '../../admin/api/use-update-order-status-mutation';
import { downloadLaserPrintImage } from '../../admin/lib/download-laser-image';
import {
  normalizeOrderStatus,
  statusLabelMn,
} from '../../admin/lib/order-status';

const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1560507074-b9eb43a0c9a4?auto=format&fit=crop&w=400&q=80';

function formatMntDisplay(amount: number) {
  return `₮${Math.round(amount).toLocaleString('en-US')}`;
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

type OrderLineCardProps = {
  item: AdminOrderItemRow;
  orderNumber: string;
  readOnly: boolean;
};

function OrderLineCard({ item, orderNumber, readOnly }: OrderLineCardProps) {
  const [downloading, setDownloading] = useState(false);

  const product = item.products;
  const imageUri = product?.image_url?.trim() || FALLBACK_PRODUCT_IMAGE;
  const title = product?.title ?? 'Бүтээгдэхүүн';
  const subtitle = productLineSubtitle(item);
  const lineTotal = item.unit_price * item.quantity;
  const hasGiftWrap = item.gift_option_id != null;
  const giftName = item.gift_options?.name?.trim();
  const giftImageUri = giftWrapImageUrl(item);
  const laserUri = item.laser_print_image_url?.trim();

  const onDownloadLaser = async () => {
    if (!laserUri) return;
    setDownloading(true);
    try {
      await downloadLaserPrintImage({
        imageUrl: laserUri,
        orderNumber,
        productTitle: title,
      });
    } catch (e) {
      Alert.alert(
        'Алдаа',
        e instanceof Error ? e.message : 'Зураг татаж чадсангүй.',
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View className="mb-3 rounded-2xl bg-white p-4 shadow-sm">
      <View className="flex-row">
        <Image
          source={{ uri: imageUri }}
          className="h-20 w-20 rounded-xl"
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
        <View className="ml-3 flex-1 justify-center">
          <Text
            className="font-serif text-base font-semibold text-vinyl-black"
            numberOfLines={2}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-0.5 text-xs text-vinyl-muted" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
          <Text className="mt-2 text-sm font-semibold text-vinyl-black">
            {formatMntDisplay(item.unit_price)}
            <Text className="font-normal text-vinyl-muted">
              {' '}
              × {item.quantity} = {formatMntDisplay(lineTotal)}
            </Text>
          </Text>
        </View>
      </View>

      {hasGiftWrap ? (
        <View className="mt-3 overflow-hidden rounded-xl bg-vinyl-surface">
          <View className="flex-row items-center gap-2 px-3 pt-3">
            <Gift size={16} color="#0A0A0A" />
            <View className="flex-1">
              <Text className="text-xs font-semibold text-vinyl-black">
                Бэлгийн боодол
              </Text>
              {giftName ? (
                <Text className="text-xs text-vinyl-muted">{giftName}</Text>
              ) : null}
            </View>
          </View>
          {giftImageUri ? (
            <Image
              source={{ uri: giftImageUri }}
              className="mt-2 h-28 w-full"
              resizeMode="cover"
              accessibilityLabel={giftName ?? 'Бэлгийн боодол'}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View className="mt-2 h-28 items-center justify-center bg-vinyl-divider">
              <Text className="text-xs text-vinyl-muted">Зураг олдсонгүй</Text>
            </View>
          )}
        </View>
      ) : null}

      {laserUri ? (
        <View className="mt-3 overflow-hidden rounded-xl bg-vinyl-surface">
          <View className="flex-row items-center gap-2 px-3 pt-3">
            <Printer size={16} color="#0A0A0A" />
            <Text className="text-xs font-semibold text-vinyl-black">
              Лазер хэвлэл
            </Text>
          </View>
          <Image
            source={{ uri: laserUri }}
            className="mt-2 h-36 w-full"
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
          {!readOnly ? (
            <Pressable
              onPress={() => void onDownloadLaser()}
              disabled={downloading}
              accessibilityRole="button"
              accessibilityLabel="Лазер хэвлэлийн зураг татаж авах"
              className="mx-3 mb-3 mt-2 flex-row items-center justify-center rounded-xl bg-vinyl-black py-2.5"
            >
              {downloading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Download size={16} color="#FFFFFF" />
                  <Text className="ml-2 text-xs font-semibold text-vinyl-paper">
                    Татаж аван хэвлэх
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

type OrderDetailScreenProps = {
  readOnly: boolean;
  orders: AdminOrderWithDetails[] | undefined;
  isPending: boolean;
};

export function OrderDetailScreen({
  readOnly,
  orders,
  isPending,
}: OrderDetailScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const orderId = typeof params.id === 'string' ? params.id : '';

  const updateStatusMutation = useUpdateOrderStatusMutation();
  const [statusBusy, setStatusBusy] = useState(false);

  const order = useMemo(
    () => orders?.find((o) => o.id === orderId),
    [orders, orderId],
  );

  const isDelivered =
    order != null && normalizeOrderStatus(order.status) === 'delivered';

  const addressLines = order ? deliveryAddressLines(order) : [];
  const phone = order ? customerPhoneFromOrder(order) : '';

  const onToggleDelivered = () => {
    if (!order) return;
    setStatusBusy(true);
    updateStatusMutation.mutate(
      { orderId: order.id, currentStatus: order.status },
      {
        onSettled: () => setStatusBusy(false),
        onError: (e) =>
          Alert.alert(
            'Алдаа',
            e instanceof Error ? e.message : 'Төлөв шинэчилж чадсангүй.',
          ),
      },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1 bg-vinyl-surface">
        <View className="bg-white px-6 pb-2 pt-2">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Буцах"
              hitSlop={8}
              className="h-10 w-10 items-center justify-center"
            >
              <ArrowLeft size={22} color="#0A0A0A" />
            </Pressable>
            <Image
              source={require('../../../../assets/logo.png')}
              style={{ width: 26, height: 26 }}
              resizeMode="contain"
              accessibilityLabel="VinylHead"
            />
            <View className="h-10 w-10" />
          </View>
        </View>

        {isPending ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : !order ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center text-base font-semibold text-vinyl-black">
              Захиалга олдсонгүй
            </Text>
            <Pressable
              onPress={() => router.back()}
              className="mt-4 rounded-xl bg-vinyl-black px-6 py-3"
            >
              <Text className="text-sm font-semibold text-vinyl-paper">Буцах</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: readOnly ? 32 : 120,
              }}
            >
              <View className="bg-vinyl-surface px-6 pt-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-vinyl-muted">
                    #{order.order_number}
                  </Text>
                  <StatusBadge status={order.status} />
                </View>
                <Text className="mt-2 font-serif text-2xl font-semibold text-vinyl-black">
                  {customerNameFromOrder(order)}
                </Text>
                <Text className="mt-1 text-sm text-vinyl-muted">
                  {formatOrderDateTime(order.created_at)}
                </Text>
                {order.payment_method ? (
                  <Text className="mt-1 text-xs text-vinyl-muted">
                    Төлбөр: {order.payment_method}
                  </Text>
                ) : null}
              </View>

              <View className="mt-4 px-6">
                <View className="rounded-2xl bg-white p-4 shadow-sm">
                  <Text className="font-serif text-lg font-semibold text-vinyl-black">
                    Хүргэлтийн мэдээлэл
                  </Text>
                  <View className="mt-3 flex-row items-start gap-3">
                    <User size={18} color="#6B6B6B" />
                    <View className="flex-1">
                      <Text className="text-xs text-vinyl-muted">Нэр</Text>
                      <Text className="text-sm font-semibold text-vinyl-black">
                        {customerNameFromOrder(order)}
                      </Text>
                    </View>
                  </View>
                  {phone ? (
                    <View className="mt-3 flex-row items-start gap-3">
                      <Phone size={18} color="#6B6B6B" />
                      <View className="flex-1">
                        <Text className="text-xs text-vinyl-muted">Утас</Text>
                        <Text className="text-sm font-semibold text-vinyl-black">
                          {phone}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {addressLines.length > 0 ? (
                    <View className="mt-3 flex-row items-start gap-3">
                      <MapPin size={18} color="#6B6B6B" />
                      <View className="flex-1">
                        <Text className="text-xs text-vinyl-muted">Хаяг</Text>
                        {addressLines.map((line) => (
                          <Text
                            key={line}
                            className="text-sm font-semibold text-vinyl-black"
                          >
                            {line}
                          </Text>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <Text className="mt-3 text-sm text-vinyl-muted">
                      Хаягийн мэдээлэл байхгүй
                    </Text>
                  )}
                </View>
              </View>

              <View className="mt-4 px-6">
                <View className="rounded-2xl bg-white p-4 shadow-sm">
                  <Text className="font-serif text-lg font-semibold text-vinyl-black">
                    Төлбөрийн дүн
                  </Text>
                  <View className="mt-3 flex-row justify-between">
                    <Text className="text-sm text-vinyl-muted">Дэд дүн</Text>
                    <Text className="text-sm font-semibold text-vinyl-black">
                      {formatMnt(order.subtotal)}
                    </Text>
                  </View>
                  {order.gift_wrap_total > 0 ? (
                    <View className="mt-2 flex-row justify-between">
                      <Text className="text-sm text-vinyl-muted">Бэлгийн боодол</Text>
                      <Text className="text-sm font-semibold text-vinyl-black">
                        {formatMnt(order.gift_wrap_total)}
                      </Text>
                    </View>
                  ) : null}
                  {order.delivery_fee > 0 ? (
                    <View className="mt-2 flex-row justify-between">
                      <Text className="text-sm text-vinyl-muted">Хүргэлт</Text>
                      <Text className="text-sm font-semibold text-vinyl-black">
                        {formatMnt(order.delivery_fee)}
                      </Text>
                    </View>
                  ) : null}
                  <View className="my-3 h-px bg-vinyl-divider" />
                  <View className="flex-row justify-between">
                    <Text className="text-base font-semibold text-vinyl-black">
                      Нийт
                    </Text>
                    <Text className="text-base font-bold text-vinyl-black">
                      {formatMnt(order.total_amount)}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="mt-6 px-6">
                <Text className="mb-3 font-serif text-lg font-semibold text-vinyl-black">
                  Захиалсан бараа ({order.order_items.length})
                </Text>
                {order.order_items.map((line) => (
                  <OrderLineCard
                    key={line.id}
                    item={line}
                    orderNumber={order.order_number}
                    readOnly={readOnly}
                  />
                ))}
              </View>
            </ScrollView>

            {!readOnly ? (
              <SafeAreaView
                edges={['bottom']}
                className="absolute bottom-0 left-0 right-0 border-t border-vinyl-divider/60 bg-vinyl-surface px-6 pt-3"
              >
                <Pressable
                  onPress={onToggleDelivered}
                  disabled={statusBusy}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isDelivered
                      ? 'Баталгаажсан болгох'
                      : 'Хүргэгдсэн гэж тэмдэглэх'
                  }
                  className={`h-14 items-center justify-center rounded-full ${
                    isDelivered ? 'border border-vinyl-black bg-white' : 'bg-vinyl-black'
                  }`}
                >
                  {statusBusy ? (
                    <ActivityIndicator color={isDelivered ? '#0A0A0A' : '#FFFFFF'} />
                  ) : (
                    <Text
                      className={`text-base font-semibold ${
                        isDelivered ? 'text-vinyl-black' : 'text-white'
                      }`}
                    >
                      {isDelivered
                        ? 'Баталгаажсан болгох'
                        : 'Хүргэгдсэн гэж тэмдэглэх'}
                    </Text>
                  )}
                </Pressable>
              </SafeAreaView>
            ) : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
