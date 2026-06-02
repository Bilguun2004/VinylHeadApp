/**
 * Tracks which chat thread (if any) the user is currently viewing.
 * The foreground notification handler reads this so it can skip the banner
 * for a thread the user is already looking at, while still showing banners
 * for other threads or when the chat screen is closed.
 */
let activeChatThreadId: string | null = null;

export function setActiveChatThreadId(threadId: string | null): void {
  activeChatThreadId = threadId;
}

export function getActiveChatThreadId(): string | null {
  return activeChatThreadId;
}
