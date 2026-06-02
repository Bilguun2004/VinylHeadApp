import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminProductsScreen } from '../../admin/screens/admin-products-screen';
import { useAuthSessionQuery } from '../../auth/api/use-auth-session-query';
import { useCart } from '../../cart/context/cart-context';
import { CustomerCartTab } from '../../cart/screens/customer-cart-tab';
import { CustomerChatScreen } from '../../chat/screens/customer-chat-screen';
import { chatKeys } from '../../chat/api/chat-keys';
import { useKeyboardHeight } from '../../chat/hooks/use-keyboard-height';
import { useChatThreadQuery } from '../../chat/api/use-chat-thread-query';
import { CustomerBottomNav } from '../components/customer-bottom-nav';
import { CustomerHomeHeader } from '../components/customer-home-header';
import { CustomerSearchTab } from './customer-search-tab';
import { CustomerProfileTab } from '../../profile/components/customer-profile-tab';
import { useProfileQuery } from '../../profile/api/use-profile-query';
import { ProductCard } from '../../products/components/product-card';
import { useHomeNavCategoriesQuery } from '../../products/api/use-categories-query';
import { useProductsQuery } from '../../products/api/use-products-query';
import { supabase } from '../../../lib/supabase';
import { debugLog } from '../../../lib/debug-log';

/** UI-only id: show all products in the main category (no sub_category filter). */
export const ALL_SUB_CATEGORY_ID = '__all__';

export function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const sessionQuery = useAuthSessionQuery();
  const qc = useQueryClient();
  const isAdmin =
    String(sessionQuery.data?.user.app_metadata?.role ?? '') === 'admin';
  const userId = sessionQuery.data?.user.id ?? null;

  const { width: screenWidth } = useWindowDimensions();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeSubCategoryId, setActiveSubCategoryId] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<
    'shop' | 'search' | 'chat' | 'cart' | 'profile'
  >(
    'shop',
  );
  const hideBottomNav = activeTab === 'chat' && keyboardHeight > 0;
  const { itemCount, pendingHomeTab, setPendingHomeTab } = useCart();
  const keyboardHeight = useKeyboardHeight();

  const profileQuery = useProfileQuery(!isAdmin ? (userId ?? undefined) : undefined);

  const threadQuery = useChatThreadQuery(userId, {
    enabled: sessionQuery.isSuccess && !isAdmin,
  });

  const chatHasUnread = useMemo(() => {
    const t = threadQuery.data;
    if (!t?.last_message_at) return false;
    const last = new Date(t.last_message_at).getTime();
    const read = t.user_last_read_at ? new Date(t.user_last_read_at).getTime() : 0;
    return Number.isFinite(last) && last > read;
  }, [threadQuery.data]);

  useEffect(() => {
    if (pendingHomeTab === 'cart' || pendingHomeTab === 'chat') {
      // #region agent log
      void debugLog(
        'home-screen.tsx:pendingHomeTab',
        'opening tab from pending home intent',
        { pendingHomeTab },
        'H-E',
      );
      // #endregion
      setActiveTab(pendingHomeTab);
      setPendingHomeTab(null);
    }
  }, [pendingHomeTab, setPendingHomeTab]);

  useEffect(() => {
    if (params.tab === 'cart') {
      // #region agent log
      void debugLog(
        'home-screen.tsx:tabEffect',
        'switching to cart tab from params',
        { tab: params.tab },
        'H-E',
      );
      // #endregion
      setActiveTab('cart');
    }
    if (params.tab === 'chat') {
      setActiveTab('chat');
    }
    if (params.tab === 'search') {
      setActiveTab('search');
    }
  }, [params.tab]);

  useEffect(() => {
    // #region agent log
    void debugLog(
      'home-screen.tsx:activeTab',
      'activeTab changed',
      { activeTab, itemCount },
      'H-E',
    );
    // #endregion
  }, [activeTab, itemCount]);

  useEffect(() => {
    if (!userId || isAdmin || !threadQuery.data?.id) return;
    const threadId = threadQuery.data.id;

    const channel = supabase
      .channel(`chat-badge-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: chatKeys.thread(userId) });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, isAdmin, threadQuery.data?.id, qc]);

  const navCategoriesQuery = useHomeNavCategoriesQuery({
    enabled: sessionQuery.isSuccess && !isAdmin,
  });

  const activeCategory = useMemo(
    () => navCategoriesQuery.data?.find((c) => c.id === activeCategoryId),
    [navCategoriesQuery.data, activeCategoryId],
  );

  const activeSubCategories = activeCategory?.sub_categories ?? [];

  useEffect(() => {
    const rows = navCategoriesQuery.data;
    if (!rows?.length) return;
    setActiveCategoryId((current) => {
      if (current && rows.some((c) => c.id === current)) return current;
      return rows[0].id;
    });
  }, [navCategoriesQuery.data]);

  const subNavItems = useMemo(() => {
    if (activeSubCategories.length === 0) return [];
    return [
      { id: ALL_SUB_CATEGORY_ID, name: 'Бүгд' },
      ...activeSubCategories,
    ];
  }, [activeSubCategories]);

  useEffect(() => {
    if (activeSubCategories.length === 0) {
      setActiveSubCategoryId(null);
      return;
    }
    setActiveSubCategoryId((current) => {
      if (current === ALL_SUB_CATEGORY_ID) return current;
      if (current && activeSubCategories.some((s) => s.id === current)) {
        return current;
      }
      return ALL_SUB_CATEGORY_ID;
    });
  }, [activeCategoryId, activeSubCategories]);

  const filterSubCategoryId =
    activeSubCategoryId === ALL_SUB_CATEGORY_ID ? null : activeSubCategoryId;

  const productsQuery = useProductsQuery(activeCategoryId, filterSubCategoryId, {
    enabled:
      sessionQuery.isSuccess && !isAdmin && activeCategoryId != null,
  });

  const horizontalPadding = 24;
  const gutter = 16;
  const cardWidth = useMemo(() => {
    const contentWidth = screenWidth - horizontalPadding * 2;
    return (contentWidth - gutter) / 2;
  }, [screenWidth]);

  const onOpen = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  if (sessionQuery.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-vinyl-paper" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (isAdmin) {
    return <AdminProductsScreen />;
  }

  if (navCategoriesQuery.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-vinyl-paper" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (navCategoriesQuery.isError) {
    return (
      <SafeAreaView className="flex-1 bg-vinyl-paper" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base font-semibold text-vinyl-black">
            Ангиллуудыг ачаалж чадсангүй
          </Text>
          <Text className="mt-2 text-center text-sm text-vinyl-muted">
            Supabase болон сүлжээний тохиргоогоо шалгана уу.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-vinyl-paper" edges={['top']}>
      <View className="flex-1">
        {activeTab === 'shop' ? (
          <>
            <CustomerHomeHeader
              avatarUrl={profileQuery.data?.avatar_url ?? null}
              cartCount={itemCount}
              onProfilePress={() => setActiveTab('profile')}
              onCartPress={() => setActiveTab('cart')}
            />

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
                        isActive ? 'bg-vinyl-black' : 'bg-vinyl-surface'
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

              {activeSubCategories.length > 0 ? (
                <>
                  <FlatList
                    data={subNavItems}
                    keyExtractor={(s) => s.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 12 }}
                    ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
                    renderItem={({ item: sub }) => {
                      const isSubActive = sub.id === activeSubCategoryId;
                      return (
                        <Pressable
                          onPress={() => setActiveSubCategoryId(sub.id)}
                          accessibilityRole="tab"
                          accessibilityState={{ selected: isSubActive }}
                          accessibilityLabel={sub.name}
                          className={`rounded-full px-4 py-2 ${
                            isSubActive ? 'bg-vinyl-black' : 'bg-vinyl-surface'
                          }`}
                        >
                          <Text
                            className={`text-sm font-semibold ${
                              isSubActive ? 'text-vinyl-paper' : 'text-vinyl-muted'
                            }`}
                          >
                            {sub.name}
                          </Text>
                        </Pressable>
                      );
                    }}
                  />
                  {activeSubCategoryId ? (
                    <View className="pb-2">
                      <Text className="text-2xl font-extrabold text-vinyl-black">
                        {activeSubCategoryId === ALL_SUB_CATEGORY_ID
                          ? activeCategory?.name ?? ''
                          : `${activeSubCategories.find((s) => s.id === activeSubCategoryId)?.name ?? ''} ${activeCategory?.name ?? ''}`}
                      </Text>
                      <Text className="mt-1 text-sm text-vinyl-muted">
                        {activeSubCategoryId === ALL_SUB_CATEGORY_ID
                          ? `${activeCategory?.name ?? ''} ангиллын бүх бүтээгдэхүүн`
                          : `${activeCategory?.name ?? ''} ангиллын бүтээгдэхүүн`}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : null}
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
                    onPress={onOpen}
                    showAvailability
                  />
                )}
              />
            )}
          </>
        ) : activeTab === 'search' ? (
          <CustomerSearchTab
            onOpenProduct={onOpen}
            avatarUrl={profileQuery.data?.avatar_url ?? null}
            cartCount={itemCount}
            onProfilePress={() => setActiveTab('profile')}
            onCartPress={() => setActiveTab('cart')}
          />
        ) : activeTab === 'chat' ? (
          <CustomerChatScreen
            avatarUrl={profileQuery.data?.avatar_url ?? null}
            cartCount={itemCount}
            onProfilePress={() => setActiveTab('profile')}
            onCartPress={() => setActiveTab('cart')}
          />
        ) : activeTab === 'cart' ? (
          <CustomerCartTab onBackToShop={() => setActiveTab('shop')} />
        ) : (
          <CustomerProfileTab />
        )}

        {hideBottomNav ? null : (
          <CustomerBottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            cartCount={itemCount}
            chatHasUnread={chatHasUnread}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
