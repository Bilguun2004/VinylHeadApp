import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AdminOrderWithDetails } from '../../admin/api/use-admin-orders-query';
import { useAuthSessionQuery } from '../../auth/api/use-auth-session-query';
import { OrderCard } from '../../orders/components/order-card';
import { useCustomerOrdersQuery } from '../api/use-customer-orders-query';

export function CustomerOrdersScreen() {
  const router = useRouter();
  const sessionQuery = useAuthSessionQuery();
  const userId = sessionQuery.data?.user.id;
  const ordersQuery = useCustomerOrdersQuery(userId);

  const onOpenOrder = (order: AdminOrderWithDetails) => {
    router.push({
      pathname: '/order/[id]',
      params: { id: order.id },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-vinyl-paper" edges={['top']}>
      <View className="flex-1">
        <View className="flex-row items-center px-6 pb-3 pt-2">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Буцах"
            hitSlop={8}
            className="h-10 w-10 items-center justify-center"
          >
            <ArrowLeft size={22} color="#0A0A0A" />
          </Pressable>
          <Text className="ml-2 font-serif text-2xl font-semibold text-vinyl-black">
            Миний захиалга
          </Text>
        </View>

        {ordersQuery.isPending ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : ordersQuery.isError ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center text-sm text-vinyl-muted">
              Захиалга ачаалж чадсангүй.
            </Text>
          </View>
        ) : (
          <FlatList
            data={ordersQuery.data ?? []}
            keyExtractor={(o) => o.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            ListEmptyComponent={
              <Text className="pt-6 text-center text-sm text-vinyl-muted">
                Захиалга олдсонгүй.
              </Text>
            }
            renderItem={({ item }) => (
              <OrderCard order={item} onOpen={onOpenOrder} />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
