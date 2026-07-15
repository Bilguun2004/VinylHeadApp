import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import {

  Disc3,

  Gift,

  MessageCircle,

  Megaphone,

  Plus,

  Shapes,

  ShoppingBag,

} from 'lucide-react-native';

import { useEffect, useMemo, useState } from 'react';

import { Alert, Pressable, Text, View } from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';



import { CustomerShopCatalog } from '../../products/components/customer-shop-catalog';

import type { ProductWithCategory } from '../../products/api/use-product-query';

import { useDeleteProductMutation } from '../api/use-delete-product-mutation';

import { AdminHeader } from '../components/admin-header';
import { AdminCategoriesContent } from '../components/admin-categories-content';

import { AdminGiftsContent } from '../components/admin-gifts-content';

import { AdminNotificationsContent } from '../components/admin-notifications-content';

import { AdminOrdersContent } from '../components/admin-orders-content';
import { AdminChatInboxScreen } from '../../chat/screens/admin-chat-inbox-screen';
import { useAdminChatThreadsQuery } from '../../chat/api/use-admin-chat-threads-query';
import { chatKeys } from '../../chat/api/chat-keys';
import { usePostgresChannel } from '../../chat/hooks/use-postgres-channel';

type AdminTab =
  | 'products'
  | 'categories'
  | 'gifts'
  | 'notifications'
  | 'orders'
  | 'chats';

export function AdminProductsScreen() {

  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; threadId?: string }>();
  const qc = useQueryClient();

  const insets = useSafeAreaInsets();

  const deleteMutation = useDeleteProductMutation();



  const [activeTab, setActiveTab] = useState<AdminTab>('products');

  useEffect(() => {
    if (params.tab === 'chat' || params.tab === 'chats') {
      setActiveTab('chats');
    }
  }, [params.tab]);



  const threadsQuery = useAdminChatThreadsQuery({ enabled: true });

  const chatHasUnread = useMemo(() => {
    const rows = threadsQuery.data ?? [];
    for (const t of rows) {
      if (!t.last_message_at) continue;
      const last = new Date(t.last_message_at).getTime();
      const read = t.admin_last_read_at ? new Date(t.admin_last_read_at).getTime() : 0;
      if (Number.isFinite(last) && last > read) return true;
    }
    return false;
  }, [threadsQuery.data]);

  usePostgresChannel({
    enabled: true,
    channelKey: 'admin-chat-badge',
    setup: (channel) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_threads' },
        () => {
          void qc.invalidateQueries({ queryKey: chatKeys.adminThreads('') });
        },
      );
    },
  });

  const tabLabels = useMemo(

    () =>

      ({

        products: 'Бараа',

        categories: 'Ангилал',

        gifts: 'Бэлэг',

        notifications: 'Мэдэгдэл',

        chats: 'Чат',

        orders: 'Захиалга',

      }) satisfies Record<AdminTab, string>,

    [],

  );



  const onOpenMenu = (product: ProductWithCategory) => {

    Alert.alert(

      product.title,

      undefined,

      [

        {

          text: 'Засах',

          onPress: () =>

            router.push({

              pathname: '/admin/add-product',

              params: { id: product.id },

            }),

        },

        {

          text: 'Устах',

          style: 'destructive',

          onPress: () => {

            Alert.alert(

              'Устгах уу?',

              'Энэ бүтээгдэхүүнийг бүр мөсөн устгах болно.',

              [

                { text: 'Цуцлах', style: 'cancel' },

                {

                  text: 'Устгах',

                  style: 'destructive',

                  onPress: () =>
                    deleteMutation.mutate(product.id, {
                      onSuccess: () =>
                        Alert.alert('Амжилттай', 'Бүтээгдэхүүн устгагдлаа.'),
                      onError: (err) =>
                        Alert.alert(
                          'Устгаж чадсангүй',
                          err instanceof Error
                            ? err.message
                            : 'Бүтээгдэхүүнийг устгахад алдаа гарлаа. Дахин оролдоно уу.',
                        ),
                    }),

                },

              ],

            );

          },

        },

        { text: 'Хаах', style: 'cancel' },

      ],

      { cancelable: true },

    );

  };



  const productsContent = () => (
    <CustomerShopCatalog
      enabled={activeTab === 'products'}
      onProductPress={(id) =>
        router.push({
          pathname: '/admin/add-product',
          params: { id },
        })
      }
      onProductLongPress={onOpenMenu}
      showAvailability
    />
  );



  return (

    <SafeAreaView className="flex-1 bg-vinyl-paper" edges={['top']}>

      <View className="flex-1">

        <AdminHeader
          leftAction={
            activeTab === 'products' ? (
              <Pressable
                onPress={() => router.push('/admin/add-product')}
                accessibilityRole="button"
                accessibilityLabel="Бүтээгдэхүүн нэмэх"
                hitSlop={8}
                className="h-10 w-10 items-center justify-center"
              >
                <Plus size={24} color="#0A0A0A" strokeWidth={2.5} />
              </Pressable>
            ) : undefined
          }
        />

        {activeTab === 'products' ? (

          productsContent()

        ) : activeTab === 'categories' ? (

          <AdminCategoriesContent />

        ) : activeTab === 'gifts' ? (

          <AdminGiftsContent />

        ) : activeTab === 'notifications' ? (

          <AdminNotificationsContent />

        ) : activeTab === 'chats' ? (

          <AdminChatInboxScreen
            initialThreadId={
              typeof params.threadId === 'string' && params.threadId.trim()
                ? params.threadId.trim()
                : null
            }
            onInitialThreadOpened={() => router.setParams({ threadId: '' })}
          />

        ) : (

          <AdminOrdersContent />

        )}



        <View

          className="rounded-t-3xl bg-vinyl-canvas"

          style={{ paddingBottom: Math.max(insets.bottom, 12) }}

        >

          <View className="flex-row items-end px-2 pt-3">

            <Pressable

              onPress={() => setActiveTab('products')}

              accessibilityRole="tab"

              accessibilityState={{ selected: activeTab === 'products' }}

              accessibilityLabel={tabLabels.products}

              className="flex-1 items-center py-1"

              hitSlop={4}

            >

              <View className="mb-1.5 h-7 items-center justify-center">

                <Disc3

                  size={22}

                  color={activeTab === 'products' ? '#0A0A0A' : '#6B6B6B'}

                  strokeWidth={activeTab === 'products' ? 2.5 : 1.75}

                />

              </View>

              <Text

                className={`text-xs ${

                  activeTab === 'products'

                    ? 'font-semibold text-vinyl-black'

                    : 'text-vinyl-muted'

                }`}

              >

                {tabLabels.products}

              </Text>

            </Pressable>



            <Pressable

              onPress={() => setActiveTab('categories')}

              accessibilityRole="tab"

              accessibilityState={{ selected: activeTab === 'categories' }}

              accessibilityLabel={tabLabels.categories}

              className="flex-1 items-center py-1"

              hitSlop={4}

            >

              <View className="mb-1.5 h-7 items-center justify-center">

                <Shapes

                  size={22}

                  color={activeTab === 'categories' ? '#0A0A0A' : '#6B6B6B'}

                  strokeWidth={activeTab === 'categories' ? 2.5 : 1.75}

                />

              </View>

              <Text

                className={`text-xs ${

                  activeTab === 'categories'

                    ? 'font-semibold text-vinyl-black'

                    : 'text-vinyl-muted'

                }`}

              >

                {tabLabels.categories}

              </Text>

            </Pressable>



            <Pressable

              onPress={() => setActiveTab('gifts')}

              accessibilityRole="tab"

              accessibilityState={{ selected: activeTab === 'gifts' }}

              accessibilityLabel={tabLabels.gifts}

              className="flex-1 items-center py-1"

              hitSlop={4}

            >

              <View className="mb-1.5 h-7 items-center justify-center">

                <Gift

                  size={22}

                  color={activeTab === 'gifts' ? '#0A0A0A' : '#6B6B6B'}

                  strokeWidth={activeTab === 'gifts' ? 2.5 : 1.75}

                />

              </View>

              <Text

                className={`text-xs ${

                  activeTab === 'gifts'

                    ? 'font-semibold text-vinyl-black'

                    : 'text-vinyl-muted'

                }`}

              >

                {tabLabels.gifts}

              </Text>

            </Pressable>



            <Pressable

              onPress={() => setActiveTab('notifications')}

              accessibilityRole="tab"

              accessibilityState={{ selected: activeTab === 'notifications' }}

              accessibilityLabel={tabLabels.notifications}

              className="flex-1 items-center py-1"

              hitSlop={4}

            >

              <View className="relative mb-1.5 h-7 items-center justify-center">

                <Megaphone

                  size={22}

                  color={

                    activeTab === 'notifications' ? '#0A0A0A' : '#6B6B6B'

                  }

                  strokeWidth={activeTab === 'notifications' ? 2.5 : 1.75}

                />

                {activeTab === 'notifications' ? (

                  <View className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-vinyl-sale" />

                ) : null}

              </View>

              <Text

                className={`text-xs ${

                  activeTab === 'notifications'

                    ? 'font-semibold text-vinyl-black'

                    : 'text-vinyl-muted'

                }`}

              >

                {tabLabels.notifications}

              </Text>

            </Pressable>



            <Pressable

              onPress={() => setActiveTab('chats')}

              accessibilityRole="tab"

              accessibilityState={{ selected: activeTab === 'chats' }}

              accessibilityLabel={tabLabels.chats}

              className="flex-1 items-center py-1"

              hitSlop={4}

            >

              <View className="relative mb-1.5 h-7 items-center justify-center">

                <MessageCircle

                  size={22}

                  color={activeTab === 'chats' ? '#0A0A0A' : '#6B6B6B'}

                  strokeWidth={activeTab === 'chats' ? 2.5 : 1.75}

                />
                {chatHasUnread ? (
                  <View className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-red-600" />
                ) : null}

              </View>

              <Text

                className={`text-xs ${

                  activeTab === 'chats'

                    ? 'font-semibold text-vinyl-black'

                    : 'text-vinyl-muted'

                }`}

              >

                {tabLabels.chats}

              </Text>

            </Pressable>

            <Pressable

              onPress={() => setActiveTab('orders')}

              accessibilityRole="tab"

              accessibilityState={{ selected: activeTab === 'orders' }}

              accessibilityLabel={tabLabels.orders}

              className="flex-1 items-center py-1"

              hitSlop={4}

            >

              <View className="mb-1.5 h-7 items-center justify-center">

                <ShoppingBag

                  size={22}

                  color={activeTab === 'orders' ? '#0A0A0A' : '#6B6B6B'}

                  strokeWidth={activeTab === 'orders' ? 2.5 : 1.75}

                />

              </View>

              <Text

                className={`text-xs ${

                  activeTab === 'orders'

                    ? 'font-semibold text-vinyl-black'

                    : 'text-vinyl-muted'

                }`}

              >

                {tabLabels.orders}

              </Text>

            </Pressable>

          </View>

        </View>

      </View>

    </SafeAreaView>

  );

}

