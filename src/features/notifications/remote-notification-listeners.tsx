import { usePathname, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { debugLog } from '../../lib/debug-log';
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

type ChatNotificationData = {
  type?: string;
  threadId?: string;
  messageId?: string;
  senderRole?: string;
  senderName?: string;
  senderAvatarUrl?: string;
};

function shouldSuppressForThread(data: ChatNotificationData | undefined): boolean {
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
  const data = content.data as ChatNotificationData | undefined;
  const isChat = data?.type === 'chat';
  const pushTitle = content.title?.trim() || 'VinylHead';
  const body = content.body?.trim() || '';

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
      | ChatNotificationData
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
  const { showNotification, dismissNotification } = useInAppNotification();

  const openFromData = useCallback(
    (data: ChatNotificationData | undefined) => {
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
          | ChatNotificationData
          | undefined;

        void debugLog(
          'remote-notification-listeners.tsx',
          'Notification received on device',
          {
            title: incoming.request.content.title ?? null,
            type: data?.type ?? null,
            foreground: AppState.currentState === 'active',
          },
          'H6',
        );

        if (shouldSuppressForThread(data)) return;
        if (AppState.currentState !== 'active') return;

        showNotification(buildInAppPayload(incoming));
      },
    );

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        dismissNotification();
        openFromData(
          response.notification.request.content.data as
            | ChatNotificationData
            | undefined,
        );
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
        | ChatNotificationData
        | undefined;
      if (data?.type === 'chat') {
        openChatFromColdStartNotification(router, setPendingHomeTab, {
          isAdmin,
          threadId: data.threadId,
        });
      }
    });
  }, [authReady, isAdmin, router, sessionQuery.isSuccess, setPendingHomeTab]);

  return null;
}
