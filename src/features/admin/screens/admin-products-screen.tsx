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

import {

  ActivityIndicator,

  Alert,

  FlatList,

  Pressable,

  Text,

  View,

  useWindowDimensions,

} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';



import { ProductCard } from '../../products/components/product-card';

import { useHomeNavCategoriesQuery } from '../../products/api/use-categories-query';

import { useProductsQuery } from '../../products/api/use-products-query';

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
import { supabase } from '../../../lib/supabase';

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

  const { width: screenWidth } = useWindowDimensions();

  const deleteMutation = useDeleteProductMutation();



  const [activeTab, setActiveTab] = useState<AdminTab>('products');

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (params.tab === 'chat' || params.tab === 'chats') {
      setActiveTab('chats');
    }
  }, [params.tab]);



  const navCategoriesQuery = useHomeNavCategoriesQuery();
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

  useEffect(() => {
    const channel = supabase
      .channel('admin-chat-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_threads' },
        () => {
          void qc.invalidateQueries({ queryKey: chatKeys.adminThreads('') });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const productsQuery = useProductsQuery(activeCategoryId, null, {
    enabled: activeTab === 'products' && activeCategoryId != null,
  });



  const horizontalPadding = 24;

  const gutter = 16;

  const cardWidth = useMemo(() => {

    const contentWidth = screenWidth - horizontalPadding * 2;

    return (contentWidth - gutter) / 2;

  }, [screenWidth]);



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



  useEffect(() => {

    const rows = navCategoriesQuery.data;

    if (!rows?.length) return;

    setActiveCategoryId((current) => {

      if (current && rows.some((c) => c.id === current)) return current;

      return rows[0].id;

    });

  }, [navCategoriesQuery.data]);



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

                  onPress: () => deleteMutation.mutate(product.id),

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



  const productsContent = () => {

    if (navCategoriesQuery.isPending) {

      return (

        <View className="flex-1 items-center justify-center">

          <ActivityIndicator />

        </View>

      );

    }



    if (navCategoriesQuery.isError) {

      return (

        <View className="flex-1 items-center justify-center px-6">

          <Text className="text-center text-base font-semibold text-vinyl-black">

            Ангиллуудыг ачаалж чадсангүй

          </Text>

          <Text className="mt-2 text-center text-sm text-vinyl-muted">

            Supabase болон сүлжээний тохиргоогоо шалгана уу.

          </Text>

        </View>

      );

    }



    return (

      <>

        <View className="px-6">

          <FlatList

            data={navCategoriesQuery.data ?? []}

            keyExtractor={(c) => c.id}

            horizontal

            showsHorizontalScrollIndicator={false}

            contentContainerStyle={{ paddingTop: 10, paddingBottom: 14 }}

            ItemSeparatorComponent={() => <View style={{ width: 10 }} />}

            renderItem={({ item }) => {

              const isActive = item.id === activeCategoryId;

              return (

                <Pressable

                  onPress={() => setActiveCategoryId(item.id)}

                  accessibilityRole="tab"

                  accessibilityState={{ selected: isActive }}

                  accessibilityLabel={item.name}

                  className={`rounded-full px-4 py-2 ${

                    isActive ? 'bg-vinyl-black' : 'bg-vinyl-paper'

                  }`}

                >

                  <Text

                    className={`text-sm font-semibold ${

                      isActive ? 'text-vinyl-paper' : 'text-vinyl-muted'

                    }`}

                  >

                    {item.name}

                  </Text>

                </Pressable>

              );

            }}

          />

        </View>



        {activeCategoryId == null ? (

          <View className="flex-1 items-center justify-center px-6">

            <Text className="text-center text-sm text-vinyl-muted">

              Ангилал алга байна.

            </Text>

          </View>

        ) : productsQuery.isPending ? (

          <View className="flex-1 items-center justify-center">

            <ActivityIndicator />

          </View>

        ) : productsQuery.isError ? (

          <View className="flex-1 items-center justify-center px-6">

            <Text className="text-center text-base font-semibold text-vinyl-black">

              Ачаалж чадсангүй

            </Text>

            <Text className="mt-2 text-center text-sm text-vinyl-muted">

              Сүлжээ болон Supabase тохиргоогоо шалгана уу.

            </Text>

          </View>

        ) : (

          <FlatList

            data={productsQuery.data ?? []}

            keyExtractor={(p) => p.id}

            numColumns={2}

            columnWrapperStyle={{

              paddingHorizontal: horizontalPadding,

              justifyContent: 'space-between',

            }}

            contentContainerStyle={{ paddingBottom: 16 }}

            ItemSeparatorComponent={() => <View style={{ height: gutter }} />}

            showsVerticalScrollIndicator={false}

            ListEmptyComponent={

              <View className="px-6 pt-10">

                <Text className="text-center text-sm text-vinyl-muted">

                  Бараа олдсонгүй.

                </Text>

              </View>

            }

            renderItem={({ item }) => (

              <ProductCard

                product={item}

                width={cardWidth}

                onPress={(id) =>

                  router.push({

                    pathname: '/admin/add-product',

                    params: { id },

                  })

                }

                onLongPress={onOpenMenu}

              />

            )}

          />

        )}

      </>

    );

  };



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

