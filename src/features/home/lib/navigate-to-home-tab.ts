import type { Router } from 'expo-router';
import { InteractionManager } from 'react-native';

import { debugLog } from '../../../lib/debug-log';

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
  // #region agent log
  void debugLog(
    'navigate-to-home-tab.ts',
    'navigateToHomeTab invoked',
    { tab, pathname, canGoBack: router.canGoBack() },
    'H-N1',
    'post-fix-v2',
  );
  // #endregion

  setPendingHomeTab(tab);

  if (isOnHomeRoute(pathname)) {
    // #region agent log
    void debugLog(
      'navigate-to-home-tab.ts',
      'already on home — pending tab only',
      { tab, pathname },
      'H-N1',
      'post-fix-v2',
    );
    // #endregion
    return;
  }

  InteractionManager.runAfterInteractions(() => {
    router.navigate(`/home?tab=${tab}`);
    // #region agent log
    void debugLog(
      'navigate-to-home-tab.ts',
      'router.navigate to home tab',
      { tab, pathname },
      'H-N1',
      'post-fix-v2',
    );
    // #endregion
  });
}

/** Safe for cold-start: only sets tab intent; auth gate / home screen handle routing. */
export function requestHomeTab(
  setPendingHomeTab: (tab: PendingHomeTab | null) => void,
  tab: PendingHomeTab,
): void {
  // #region agent log
  void debugLog(
    'navigate-to-home-tab.ts',
    'requestHomeTab (no router call)',
    { tab },
    'H-N9',
    'post-fix-v2',
  );
  // #endregion
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

  void debugLog(
    'navigate-to-home-tab.ts',
    'navigateToChatNotification invoked',
    { ...options, pathname, href },
    'H-N2',
    'post-fix-v3',
  );

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
  void debugLog(
    'navigate-to-home-tab.ts',
    'openChatFromColdStartNotification',
    options,
    'H-N3',
    'post-fix-v3',
  );

  if (options.isAdmin) {
    router.replace(buildChatHomeHref(options));
    return;
  }

  requestHomeTab(setPendingHomeTab, 'chat');
}
