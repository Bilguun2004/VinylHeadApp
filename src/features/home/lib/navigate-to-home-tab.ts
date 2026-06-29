import type { Router } from 'expo-router';
import { InteractionManager } from 'react-native';

export type PendingHomeTab = 'cart' | 'chat';

export function isOnHomeRoute(pathname: string): boolean {
  return (
    pathname === '/home' ||
    pathname.startsWith('/home?') ||
    pathname.startsWith('/home/')
  );
}

export function navigateToHomeTab(
  router: Router,
  pathname: string,
  setPendingHomeTab: (tab: PendingHomeTab | null) => void,
  tab: PendingHomeTab,
): void {
  setPendingHomeTab(tab);

  if (isOnHomeRoute(pathname)) {
    return;
  }

  InteractionManager.runAfterInteractions(() => {
    router.navigate(`/home?tab=${tab}`);
  });
}

/** Safe for cold-start: only sets tab intent; auth gate / home screen handle routing. */
export function requestHomeTab(
  setPendingHomeTab: (tab: PendingHomeTab | null) => void,
  tab: PendingHomeTab,
): void {
  setPendingHomeTab(tab);
}

export type ChatNotificationNavigation = {
  isAdmin: boolean;
  threadId?: string;
};

function buildChatHomeHref({ isAdmin, threadId }: ChatNotificationNavigation): string {
  const tab = isAdmin ? 'chats' : 'chat';
  const params = new URLSearchParams({ tab });
  if (isAdmin && threadId?.trim()) {
    params.set('threadId', threadId.trim());
  }
  return `/home?${params.toString()}`;
}

function buildChatHomeParams({ isAdmin, threadId }: ChatNotificationNavigation): Record<string, string> {
  const tab = isAdmin ? 'chats' : 'chat';
  const params: Record<string, string> = { tab };
  if (isAdmin && threadId?.trim()) {
    params.threadId = threadId.trim();
  } else {
    params.threadId = '';
  }
  return params;
}

/** Opens chat from a push notification tap (admin thread or customer chat tab). */
export function navigateToChatNotification(
  router: Router,
  pathname: string,
  setPendingHomeTab: (tab: PendingHomeTab | null) => void,
  options: ChatNotificationNavigation,
): void {
  const href = buildChatHomeHref(options);

  if (!options.isAdmin) {
    setPendingHomeTab('chat');
  }

  if (isOnHomeRoute(pathname)) {
    router.setParams(buildChatHomeParams(options));
    return;
  }

  InteractionManager.runAfterInteractions(() => {
    router.navigate(href);
  });
}

/** Cold-start: navigate to chat from last notification (admin opens specific thread). */
export function openChatFromColdStartNotification(
  router: Router,
  setPendingHomeTab: (tab: PendingHomeTab | null) => void,
  options: ChatNotificationNavigation,
): void {
  if (options.isAdmin) {
    router.replace(buildChatHomeHref(options));
    return;
  }

  requestHomeTab(setPendingHomeTab, 'chat');
}
