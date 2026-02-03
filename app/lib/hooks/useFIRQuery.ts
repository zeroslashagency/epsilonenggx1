"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Report } from '@/app/types/fir';
import { reportService } from '@/app/lib/features/fir/fir.service';
import { toast } from 'sonner';

// Query Keys
export const firQueryKeys = {
    all: ['fir'] as const,
    reports: () => [...firQueryKeys.all, 'reports'] as const,
    report: (id: string) => [...firQueryKeys.all, 'report', id] as const,
};

/**
 * Hook to fetch all FIR reports with React Query caching
 */
export function useFIRReports() {
    return useQuery({
        queryKey: firQueryKeys.reports(),
        queryFn: () => reportService.getReports(),
        staleTime: 1000 * 60 * 2, // 2 minutes
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    });
}

/**
 * Hook to fetch a single FIR report by ID
 */
export function useFIRReport(id: string) {
    return useQuery({
        queryKey: firQueryKeys.report(id),
        queryFn: () => reportService.getReportById(id),
        enabled: !!id,
        staleTime: 1000 * 60 * 2,
    });
}

/**
 * Hook for submitting person response (Stage 2)
 */
export function useSubmitResponse() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            reportId,
            accepted,
            comment,
            attachments
        }: {
            reportId: string;
            accepted: boolean;
            comment: string;
            attachments: any[];
        }) => {
            return reportService.submitResponse(reportId, accepted, comment, attachments);
        },
        onSuccess: (_, variables) => {
            toast.success(variables.accepted ? 'Response accepted' : 'Response submitted');
            // Invalidate queries to refetch fresh data
            queryClient.invalidateQueries({ queryKey: firQueryKeys.reports() });
            queryClient.invalidateQueries({ queryKey: firQueryKeys.report(variables.reportId) });
        },
        onError: (error) => {
            console.error('Submit response error:', error);
            toast.error('Failed to submit response');
        },
    });
}

/**
 * Hook for admin review (Stage 3)
 */
export function useAdminReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            reportId,
            decision,
            notes,
            user
        }: {
            reportId: string;
            decision: 'CONFIRM' | 'SEND_BACK';
            notes: string;
            user: any;
        }) => {
            return reportService.adminReview(reportId, decision, notes, user);
        },
        onSuccess: (_, variables) => {
            const message = variables.decision === 'CONFIRM'
                ? 'Report confirmed and closed'
                : 'Report sent back for revision';
            toast.success(message);
            queryClient.invalidateQueries({ queryKey: firQueryKeys.reports() });
            queryClient.invalidateQueries({ queryKey: firQueryKeys.report(variables.reportId) });
        },
        onError: (error) => {
            console.error('Admin review error:', error);
            toast.error('Failed to review report');
        },
    });
}

/**
 * Hook to prefetch reports (useful for navigation)
 */
export function usePrefetchFIRReports() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.prefetchQuery({
            queryKey: firQueryKeys.reports(),
            queryFn: () => reportService.getReports(),
            staleTime: 1000 * 60 * 2,
        });
    };
}

/**
 * Hook to invalidate FIR cache (useful after real-time updates)
 */
export function useInvalidateFIRCache() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({ queryKey: firQueryKeys.all });
    };
}
