import { QueryClient } from '@tanstack/react-query';

// Default cache + retry behavior for the mashup. Per-query overrides are
// expected for specific data types (e.g., session-long staleTime for the
// current-user query, 5-min staleTime for sheet lists).
//
// Tuning rationale: see docs/12-performance-and-scalability.md (Pillar 1).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Conservative default; specific queries override.
      staleTime: 60_000, // 1 min — prevents redundant refetches on mount
      gcTime: 5 * 60_000, // 5 min — unused cache entries kept this long
      retry: 2, // retry transient failures twice
      retryDelay: (i) => Math.min(1000 * 2 ** i, 8000), // exponential, capped
      refetchOnWindowFocus: false, // Qlik data isn't typically time-critical
      refetchOnReconnect: 'always', // refetch on network restore
    },
  },
});
