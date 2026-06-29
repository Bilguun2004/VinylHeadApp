import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminProductsScreen } from '../../admin/screens/admin-products-screen';
import { useAuthSessionQuery } from '../../auth/api/use-auth-session-query';
import { useCart } from '../../cart/context/cart-context';
import { CustomerCartTab } from '../../cart/screens/customer-cart-tab';
import { CustomerChatScreen } from '../../chat/screens/customer-chat-screen';
import { chatKeys } from '../../chat/api/chat-keys';
import { useKeyboardHeight } from '../../chat/hooks/use-keyboard-height';
import { useChatThreadQuery } from '../../chat/api/use-chat-thread-query';
import { usePostgresChannel } from '../../chat/hooks/use-postgres-channel';
import { CustomerBottomNav } from '../components/customer-bottom-nav';
import { CustomerHomeHeader } from '../components/customer-home-header';
import { CustomerSearchTab } from './customer-search-tab';
import { CustomerProfileTab } from '../../profile/components/customer-profile-tab';
import { useProfileQuery } from '../../profile/api/use-profile-query';
import { CustomerShopCatalog } from '../../products/components/customer-shop-catalog';
import { ALL_SUB_CATEGORY_ID } from '../../products/lib/catalog-constants';
export { ALL_SUB_CATEGORY_ID };

type HomeTab = 'shop' | 'search' | 'chat' | 'cart' | 'profile';

function tabFromParam(tab: string | undefined): HomeTab | null {
  if (tab === 'cart' || tab === 'chat' || tab === 'search') return tab;
  return null;
}

export function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const sessionQuery = useAuthSessionQuery();
  const qc = useQueryClient();
  const isAdmin =
    String(sessionQuery.data?.user.app_metadata?.role ?? '') === 'admin';
  const userId = sessionQuery.data?.user.id ?? null;

  const [activeTab, setActiveTab] = useState<HomeTab>(
    () => tabFromParam(params.tab) ?? 'shop',
  );
  const { itemCount, pendingHomeTab, setPendingHomeTab } = useCart();
  const keyboardHeight = useKeyboardHeight();
  const hideBottomNav = activeTab === 'chat' && keyboardHeight > 0;

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
      setActiveTab(pendingHomeTab);
      setPendingHomeTab(null);
    }
  }, [pendingHomeTab, setPendingHomeTab]);

  useEffect(() => {
    const tab = tabFromParam(params.tab);
    if (!tab) return;
    setActiveTab(tab);
  }, [params.tab]);

  const threadId = threadQuery.data?.id ?? null;

  usePostgresChannel({
    enabled: Boolean(userId && !isAdmin && threadId),
    channelKey: threadId ? `chat-badge-${threadId}` : '',
    setup: (channel) => {
      if (!userId || !threadId) return;
      channel.on(
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
      );
    },
  });

  const onOpen = useCallback(
    (productId: string) => {
      router.push(`/product/${productId}`);
    },
    [router],
  );

  const catalogEnabled = sessionQuery.isSuccess && !isAdmin;

  if (sessionQuery.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-vinyl-paper" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  if (sessionQuery.isError) {
    return (
      <SafeAreaView className="flex-1 bg-vinyl-paper" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base font-semibold text-vinyl-black">
            Ачаалж чадсангүй
          </Text>
          <Text className="mt-1 text-center text-sm text-vinyl-muted">
            Сүлжээгээ шалгаад дахин оролдоно уу.
          </Text>
          <Pressable
            onPress={() => void sessionQuery.refetch()}
            className="mt-4 rounded-xl bg-vinyl-black px-6 py-3"
          >
            <Text className="text-sm font-semibold text-vinyl-paper">
              Дахин оролдох
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isAdmin) {
    return <AdminProductsScreen />;
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
            <CustomerShopCatalog
              onProductPress={onOpen}
              showAvailability
              enabled={catalogEnabled}
            />
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
