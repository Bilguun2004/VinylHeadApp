export const chatKeys = {
  all: ['chat'] as const,
  thread: (userId: string) => [...chatKeys.all, 'thread', { userId }] as const,
  messages: (threadId: string) => [...chatKeys.all, 'messages', { threadId }] as const,
  adminThreads: (search: string) =>
    [...chatKeys.all, 'adminThreads', { search }] as const,
  profileSearch: (search: string) =>
    [...chatKeys.all, 'profileSearch', { search }] as const,
};

