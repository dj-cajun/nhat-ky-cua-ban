import { QueryClient } from '@tanstack/react-query';
import { isRetryableError } from '@/lib/errors';
import { retryKindFor } from '@/lib/retry-policy';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        return isRetryableError(error);
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Side-effect mutations: user-driven retry only
      retry: false,
    },
  },
});

/** Helper for feature-tagged mutations that must never auto-retry. */
export function mutationRetryDisabled(op: string): boolean {
  return retryKindFor(op) !== 'auto';
}
