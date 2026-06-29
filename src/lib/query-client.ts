import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  // Centralized failure logging. User-facing error UX is handled per-screen
  // (loading/error/empty states and mutation onError handlers); this only
  // surfaces diagnostics during development without spamming production logs.
  queryCache: new QueryCache({
    onError: (error) => {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.error('[query] failed:', error);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.error('[mutation] failed:', error);
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
