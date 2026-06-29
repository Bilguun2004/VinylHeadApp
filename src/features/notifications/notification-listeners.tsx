import { usePathname, useRouter } from 'expo-router';
import { lazy, Suspense } from 'react';
import { StyleSheet, View } from 'react-native';

import { isRemotePushSupported } from '../../lib/push-support';
import { useAuthSessionQuery } from '../auth/api/use-auth-session-query';
import { useCart } from '../cart/context/cart-context';
import { navigateToChatNotification } from '../home/lib/navigate-to-home-tab';
import { useInAppNotification } from './in-app-notification-context';
import { InAppNotificationBanner } from './in-app-notification-banner';

type InAppNotificationData = {
  type?: string;
  threadId?: string;
  orderId?: string;
};

const RemoteNotificationListeners = lazy(
  () => import('./remote-notification-listeners'),
);

/** Registers notification listeners (mount once near app root). */
export function NotificationListeners() {
  if (!isRemotePushSupported()) return null;

  return (
    <Suspense fallback={null}>
      <RemoteNotificationListeners />
    </Suspense>
  );
}

/** Full-screen overlay host so the banner sits above every screen. */
export function InAppNotificationHost() {
  const router = useRouter();
  const pathname = usePathname();
  const sessionQuery = useAuthSessionQuery();
  const isAdmin =
    String(sessionQuery.data?.user.app_metadata?.role ?? '') === 'admin';
  const { setPendingHomeTab } = useCart();
  const { notification, dismissNotification } = useInAppNotification();

  if (!notification) return null;

  const openFromData = (data: InAppNotificationData | undefined) => {
    if (data?.type === 'order' && data.orderId?.trim()) {
      router.push({
        pathname: '/admin/order/[id]',
        params: { id: data.orderId.trim() },
      });
      return;
    }
    if (data?.type !== 'chat') return;
    navigateToChatNotification(router, pathname, setPendingHomeTab, {
      isAdmin,
      threadId: data.threadId,
    });
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFillObject}>
      <InAppNotificationBanner
        notification={notification}
        onDismiss={dismissNotification}
        onPress={() => {
          openFromData(notification.data as InAppNotificationData | undefined);
          dismissNotification();
        }}
      />
    </View>
  );
}
