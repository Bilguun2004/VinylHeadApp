import { usePathname, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuthSessionQuery } from '../auth/api/use-auth-session-query';
import { useAuthReady } from '../auth/context/auth-ready-context';
import { getActiveChatThreadId } from '../chat/lib/active-chat';
import { useCart } from '../cart/context/cart-context';
import {
  navigateToChatNotification,
  openChatFromColdStartNotification,
} from '../home/lib/navigate-to-home-tab';
import {
  useInAppNotification,
  type InAppNotificationPayload,
} from './in-app-notification-context';

type PushNotificationData = {
  type?: string;
  threadId?: string;
  messageId?: string;
  senderRole?: string;
  senderName?: string;
  senderAvatarUrl?: string;
  recipientUserId?: string;
  recipientRole?: string;
  orderId?: string;
  orderNumber?: string;
  customerName?: string;
};

function shouldShowPushNotificationForSession(
  data: PushNotificationData | undefined,
  userId: string | undefined,
  isAdmin: boolean,
): boolean {
  if (!userId) return false;

  if (data?.type === 'order') {
    return isAdmin && data.recipientRole === 'admin';
  }

  if (data?.type !== 'chat') return true;

  if (data.recipientRole === 'admin') return isAdmin;
  if (data.recipientUserId) return data.recipientUserId === userId;

  return true;
}

function shouldSuppressForThread(data: PushNotificationData | undefined): boolean {
  const isChat = data?.type === 'chat';
  return (
    isChat &&
    Boolean(data?.threadId) &&
    data?.threadId === getActiveChatThreadId()
  );
}

function buildInAppPayload(
  notification: Notifications.Notification,
): InAppNotificationPayload {
  const content = notification.request.content;
  const data = content.data as PushNotificationData | undefined;
  const isChat = data?.type === 'chat';
  const isOrder = data?.type === 'order';
  const pushTitle = content.title?.trim() || 'VinylHead';
  const body = content.body?.trim() || '';

  if (isOrder) {
    return {
      id: notification.request.identifier,
      username: pushTitle,
      body,
      appName: 'VinylHead',
      data: data as Record<string, unknown> | undefined,
    };
  }

  if (isChat) {
    const username =
      data?.senderName?.trim() ||
      (pushTitle !== 'Мессеж' ? pushTitle : 'Хэрэглэгч');

    return {
      id: notification.request.identifier,
      username,
      body,
      avatarUrl: data?.senderAvatarUrl?.trim() || null,
      appName: 'VinylHead',
      data: data as Record<string, unknown> | undefined,
    };
  }

  return {
    id: notification.request.identifier,
    username: pushTitle,
    body,
    appName: 'VinylHead',
    data: data as Record<string, unknown> | undefined,
  };
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as
      | PushNotificationData
      | undefined;
    const show = !shouldSuppressForThread(data);
    const isForeground = AppState.currentState === 'active';

    return {
      shouldShowAlert: show && !isForeground,
      shouldPlaySound: show,
      shouldSetBadge: false,
      shouldShowBanner: show && !isForeground,
      shouldShowList: show && !isForeground,
    };
  },
});

/** Push listeners — only loaded in dev/standalone builds (not Expo Go Android). */
export default function RemoteNotificationListeners() {
  const router = useRouter();
  const pathname = usePathname();
  const authReady = useAuthReady();
  const sessionQuery = useAuthSessionQuery();
  const isAdmin =
    String(sessionQuery.data?.user.app_metadata?.role ?? '') === 'admin';
  const { setPendingHomeTab } = useCart();
  const handledColdStart = useRef(false);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const isAdminRef = useRef(isAdmin);
  isAdminRef.current = isAdmin;
  const userId = sessionQuery.data?.user.id;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const { showNotification, dismissNotification } = useInAppNotification();

  useEffect(() => {
    if (!userId) dismissNotification();
  }, [dismissNotification, userId]);

  const openFromData = useCallback(
    (data: PushNotificationData | undefined) => {
      if (data?.type === 'order' && data.orderId?.trim()) {
        router.push({
          pathname: '/admin/order/[id]',
          params: { id: data.orderId.trim() },
        });
        return;
      }

      if (data?.type !== 'chat') return;
      navigateToChatNotification(
        router,
        pathnameRef.current,
        setPendingHomeTab,
        {
          isAdmin: isAdminRef.current,
          threadId: data.threadId,
        },
      );
    },
    [router, setPendingHomeTab],
  );

  useEffect(() => {
    void Notifications.setNotificationChannelAsync('default', {
      name: 'VinylHead',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0A0A0A',
      sound: 'default',
      showBadge: true,
    });

    const receivedSub = Notifications.addNotificationReceivedListener(
      (incoming) => {
        const data = incoming.request.content.data as
          | PushNotificationData
          | undefined;

        if (shouldSuppressForThread(data)) return;
        if (AppState.currentState !== 'active') return;
        if (
          !shouldShowPushNotificationForSession(
            data,
            userIdRef.current,
            isAdminRef.current,
          )
        ) {
          return;
        }

        showNotification(buildInAppPayload(incoming));
      },
    );

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        dismissNotification();
        const data = response.notification.request.content.data as
          | PushNotificationData
          | undefined;
        if (
          !shouldShowPushNotificationForSession(
            data,
            userIdRef.current,
            isAdminRef.current,
          )
        ) {
          return;
        }
        openFromData(data);
      },
    );

    return () => {
      receivedSub.remove();
      subscription.remove();
    };
  }, [dismissNotification, openFromData, showNotification]);

  useEffect(() => {
    if (!authReady || !sessionQuery.isSuccess || handledColdStart.current) return;
    handledColdStart.current = true;

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      const data = response?.notification.request.content.data as
        | PushNotificationData
        | undefined;
      if (
        !shouldShowPushNotificationForSession(
          data,
          sessionQuery.data?.user.id,
          isAdmin,
        )
      ) {
        return;
      }

      if (data?.type === 'order' && data.orderId?.trim()) {
        router.replace({
          pathname: '/admin/order/[id]',
          params: { id: data.orderId.trim() },
        });
        return;
      }

      if (data?.type !== 'chat') return;

      openChatFromColdStartNotification(router, setPendingHomeTab, {
        isAdmin,
        threadId: data.threadId,
      });
    });
  }, [
    authReady,
    isAdmin,
    router,
    sessionQuery.data?.user.id,
    sessionQuery.isSuccess,
    setPendingHomeTab,
  ]);

  return null;
}
