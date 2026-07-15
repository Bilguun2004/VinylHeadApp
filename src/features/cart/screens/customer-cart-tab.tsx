import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { useAuthSessionQuery } from '../../auth/api/use-auth-session-query';
import { useProfileQuery } from '../../profile/api/use-profile-query';
import {
  useCreateOrderMutation,
  type DeliveryFormValues,
} from '../api/use-create-order-mutation';
import { CartLineCard } from '../components/cart-line-card';
import { CheckoutDeliveryForm } from '../components/checkout-delivery-form';
import {
  CheckoutPaymentSection,
  type PaymentMethodId,
} from '../components/checkout-payment-section';
import { useCart } from '../context/cart-context';
import { cartSubtotal } from '../lib/cart-pricing';
import { DELIVERY_CITIES, districtsForCity } from '../lib/mongolia-locations';

const EMPTY_DELIVERY: DeliveryFormValues = {
  fullName: '',
  phone: '',
  city: DELIVERY_CITIES[0],
  district: districtsForCity(DELIVERY_CITIES[0])[0],
  address: '',
};

function CheckoutHeader({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-row items-center px-5 pt-2">
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Буцах"
        hitSlop={8}
        className="h-10 w-10 items-center justify-center"
      >
        <ArrowLeft size={22} color="#0A0A0A" />
      </Pressable>
      <View className="flex-1 flex-row items-center justify-center">
        <Image
          source={require('../../../../assets/logo.png')}
          style={{ width: 24, height: 24 }}
          resizeMode="contain"
          accessibilityLabel="VinylHead"
        />
        <Text className="ml-2 font-normal text-base text-vinyl-black">
          Төлбөр тооцоо
        </Text>
      </View>
      <View className="h-10 w-10" />
    </View>
  );
}

type CustomerCartTabProps = {
  onBackToShop: () => void;
};

export function CustomerCartTab({ onBackToShop }: CustomerCartTabProps) {
  const { lines, hydrated, clearCart, removeLine, setLineQuantity } = useCart();

  const sessionQuery = useAuthSessionQuery();
  const userId = sessionQuery.data?.user.id;
  const profileQuery = useProfileQuery(userId);
  const createOrderMutation = useCreateOrderMutation();

  const [delivery, setDelivery] = useState<DeliveryFormValues>(EMPTY_DELIVERY);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(
    null,
  );

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) return;
    setDelivery((current) => ({
      fullName: current.fullName || profile.full_name?.trim() || '',
      phone: current.phone || profile.phone_number?.trim() || '',
      city: current.city,
      district: current.district,
      address: current.address || profile.delivery_address?.trim() || '',
    }));
  }, [profileQuery.data]);

  const subtotal = useMemo(() => cartSubtotal(lines), [lines]);
  const total = subtotal;

  const placeOrder = () => {
    if (!userId) {
      Alert.alert('Алдаа', 'Захиалахын тулд нэвтэрнэ үү.');
      return;
    }
    if (lines.length === 0) return;

    const name = delivery.fullName.trim();
    const phone = delivery.phone.trim();
    const address = delivery.address.trim();
    if (!name || !phone || !address) {
      Alert.alert('Алдаа', 'Нэр, утас, хаягийг бөглөнө үү.');
      return;
    }
    if (!paymentMethod) {
      Alert.alert('Алдаа', 'Төлбөрийн хэрэгсэлээ сонгоно уу.');
      return;
    }

    createOrderMutation.mutate(
      { userId, lines, delivery, paymentMethod },
      {
        onSuccess: async (result) => {
          clearCart();
          if (result.followUpLink) {
            try {
              await WebBrowser.openBrowserAsync(result.followUpLink);
            } catch {
              // Still tell the user the order was created even if the browser fails.
            }
            Alert.alert(
              'Төлбөр',
              'QPay төлбөрөө гүйцээнэ үү. Төлбөр амжилттай болсны дараа захиалга баталгаажна.',
              [{ text: 'OK', onPress: onBackToShop }],
            );
            return;
          }
          Alert.alert('Амжилттай', 'Таны захиалга хүлээн авлаа.', [
            { text: 'OK', onPress: onBackToShop },
          ]);
        },
        onError: (e) =>
          Alert.alert(
            'Алдаа',
            e instanceof Error ? e.message : 'Захиалга илгээж чадсангүй.',
          ),
      },
    );
  };

  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-vinyl-canvas">
        <ActivityIndicator />
      </View>
    );
  }

  if (lines.length === 0) {
    return (
      <View className="flex-1 bg-vinyl-canvas">
        <CheckoutHeader onBack={onBackToShop} />
        <View className="flex-1 items-center justify-center px-6 pb-24">
          <Text className="font-normal text-xl text-vinyl-black">Сагс хоосон</Text>
          <Text className="mt-2 text-center text-sm text-vinyl-muted">
            Бүтээгдэхүүн сонгоод сагсандаа нэмнэ үү.
          </Text>
          <Pressable
            onPress={onBackToShop}
            accessibilityRole="button"
            accessibilityLabel="Дэлгүүр үзэх"
            className="mt-6 rounded-2xl bg-vinyl-black px-6 py-3"
          >
            <Text className="text-sm font-semibold text-vinyl-paper">
              Дэлгүүр үзэх
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const busy = createOrderMutation.isPending;

  return (
    <View className="flex-1 bg-vinyl-canvas">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <CheckoutHeader onBack={onBackToShop} />

        <Text className="mt-6 px-5 font-normal text-2xl text-vinyl-black">
          Таны захиалга
        </Text>

        <View className="mt-4 px-5">
          {lines.map((line) => (
            <CartLineCard
              key={line.lineId}
              line={line}
              onRemove={removeLine}
              onQuantityChange={setLineQuantity}
            />
          ))}
        </View>

        <Text className="mt-8 px-5 font-normal text-2xl text-vinyl-black">
          Хүргэлтийн мэдээлэл
        </Text>
        <View className="mx-5 mt-4">
          <CheckoutDeliveryForm
            values={delivery}
            onChange={setDelivery}
            disabled={busy}
          />
        </View>

        <View className="mx-5 mt-8">
          <CheckoutPaymentSection
            total={total}
            selectedMethod={paymentMethod}
            onSelectMethod={setPaymentMethod}
            disabled={busy}
          />
        </View>
      </ScrollView>

      <View className="border-t border-vinyl-divider/50 bg-vinyl-canvas px-5 pb-2 pt-3">
        <Pressable
          onPress={placeOrder}
          disabled={busy || !paymentMethod}
          accessibilityRole="button"
          accessibilityLabel="Захиалах"
          className={`h-14 flex-row items-center justify-center rounded-2xl ${
            paymentMethod ? 'bg-vinyl-black' : 'bg-vinyl-muted'
          }`}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <View className="flex-row items-center">
              <Text className="text-base font-semibold text-vinyl-paper">
                Захиалах
              </Text>
              <ArrowRight
                size={20}
                color="#FFFFFF"
                style={{ marginLeft: 8 }}
              />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}
