import { useRouter } from 'expo-router';


import { useMemo, useState } from 'react';

import {

  ActivityIndicator,

  Alert,

  FlatList,

  Pressable,

  Text,

  View,

} from 'react-native';



import { OrderCard } from '../../orders/components/order-card';

import {

  isActiveOrder,

  matchesOrderFilter,

  normalizeOrderStatus,

  type OrderFilterTab,

} from '../lib/order-status';

import {

  useAdminOrdersQuery,

  type AdminOrderWithDetails,

} from '../api/use-admin-orders-query';

import { useUpdateOrderStatusMutation } from '../api/use-update-order-status-mutation';



const FILTER_TABS: { id: OrderFilterTab; label: string }[] = [

  { id: 'all', label: 'Бүгд' },

  { id: 'confirmed', label: 'Баталгаажсан' },

  { id: 'delivered', label: 'Хүргэгдсэн' },

];



const PROFILE_ORDERS_PREVIEW = 5;



export function AdminOrdersContent() {

  const router = useRouter();

  const ordersQuery = useAdminOrdersQuery();

  const updateStatusMutation = useUpdateOrderStatusMutation();



  const [filter, setFilter] = useState<OrderFilterTab>('all');

  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);



  const allOrders = ordersQuery.data ?? [];



  const activeCount = useMemo(

    () => allOrders.filter((o) => isActiveOrder(o.status)).length,

    [allOrders],

  );



  const newOrdersCount = useMemo(

    () =>

      allOrders.filter((o) => normalizeOrderStatus(o.status) === 'confirmed')

        .length,

    [allOrders],

  );



  const filteredOrders = useMemo(

    () => allOrders.filter((o) => matchesOrderFilter(o.status, filter)),

    [allOrders, filter],

  );



  const onOpenOrder = (order: AdminOrderWithDetails) => {

    router.push({

      pathname: '/admin/order/[id]',

      params: { id: order.id },

    });

  };



  const onToggleDelivered = (order: AdminOrderWithDetails) => {

    setPendingOrderId(order.id);

    updateStatusMutation.mutate(

      { orderId: order.id, currentStatus: order.status },

      {

        onSettled: () => setPendingOrderId(null),

        onError: (e) =>

          Alert.alert(

            'Алдаа',

            e instanceof Error ? e.message : 'Төлөв шинэчилж чадсангүй.',

          ),

      },

    );

  };



  const listHeader = (

    <View className="px-5 pt-2">

      <Text className="font-normal text-3xl text-vinyl-black">

        Захиалгын удирдлага

      </Text>

      <Text className="mt-1 text-sm text-vinyl-muted">

        Нийт {activeCount} идэвхтэй захиалга байна

      </Text>



      <View className="mt-4 flex-row gap-2">

        {FILTER_TABS.map((tab) => {

          const active = filter === tab.id;

          return (

            <Pressable

              key={tab.id}

              onPress={() => setFilter(tab.id)}

              accessibilityRole="tab"

              accessibilityState={{ selected: active }}

              accessibilityLabel={tab.label}

              className={`rounded-full px-4 py-2 ${

                active ? 'bg-vinyl-black' : 'bg-white'

              }`}

            >

              <Text

                className={`text-sm font-semibold ${

                  active ? 'text-vinyl-paper' : 'text-vinyl-muted'

                }`}

              >

                {tab.label}

              </Text>

            </Pressable>

          );

        })}

      </View>



      {filter === 'all' && newOrdersCount > 0 ? (

        <View className="mt-6 flex-row items-center justify-between">

          <Text className="font-normal text-xl text-vinyl-black">

            Шинэ захиалга

          </Text>

          <View className="rounded-full bg-vinyl-surface px-3 py-1">

            <Text className="text-xs font-semibold text-vinyl-muted">

              {newOrdersCount} шинэ

            </Text>

          </View>

        </View>

      ) : (

        <View className="mt-6" />

      )}

    </View>

  );



  if (ordersQuery.isPending) {

    return (

      <View className="flex-1 items-center justify-center bg-vinyl-canvas">

        <ActivityIndicator />

      </View>

    );

  }



  if (ordersQuery.isError) {

    return (

      <View className="flex-1 items-center justify-center bg-vinyl-canvas px-6">

        <Text className="text-center text-base font-semibold text-vinyl-black">

          Захиалга ачаалж чадсангүй

        </Text>

        <Text className="mt-2 text-center text-sm text-vinyl-muted">

          Сүлжээ болон Supabase тохиргоогоо шалгана уу.

        </Text>

      </View>

    );

  }



  return (

    <View className="flex-1 bg-vinyl-canvas">

      <FlatList

        data={filteredOrders}

        keyExtractor={(o) => o.id}

        showsVerticalScrollIndicator={false}

        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}

        ListHeaderComponent={listHeader}

        ListEmptyComponent={

          <Text className="pt-6 text-center text-sm text-vinyl-muted">

            Захиалга олдсонгүй.

          </Text>

        }

        renderItem={({ item }) => (

          <OrderCard

            order={item}

            onOpen={onOpenOrder}

            onToggleDelivered={onToggleDelivered}

            toggleBusy={

              updateStatusMutation.isPending && pendingOrderId === item.id

            }

          />

        )}

      />

    </View>

  );

}

