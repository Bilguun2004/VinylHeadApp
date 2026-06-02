import type { AdminChatThreadItem } from '../api/use-admin-chat-threads-query';

type UserMessageRow = {
  thread_id: string;
  created_at: string;
};

export function countAdminUnreadMessages(
  thread: AdminChatThreadItem,
  userMessages: UserMessageRow[],
): number {
  const readAt = thread.admin_last_read_at
    ? new Date(thread.admin_last_read_at).getTime()
    : 0;

  return userMessages.filter(
    (message) =>
      message.thread_id === thread.id &&
      new Date(message.created_at).getTime() > readAt,
  ).length;
}

export function buildAdminUnreadCounts(
  threads: AdminChatThreadItem[],
  userMessages: UserMessageRow[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const thread of threads) {
    const count = countAdminUnreadMessages(thread, userMessages);
    if (count > 0) counts[thread.id] = count;
  }
  return counts;
}
