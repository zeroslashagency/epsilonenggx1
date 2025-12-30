'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

/**
 * ⚡ PERFORMANCE: React Query Provider
 * - Automatic caching and deduplication
 * - Background refresh
 * - Stale-while-revalidate
 */
export function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // ⚡ Default stale time: 30 seconds
                        staleTime: 30 * 1000,
                        // ⚡ Cache for 5 minutes
                        gcTime: 5 * 60 * 1000,
                        // ⚡ Retry failed requests once
                        retry: 1,
                        // ⚡ Refetch on window focus (good for realtime data)
                        refetchOnWindowFocus: true,
                    },
                },
            })
    )

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}
