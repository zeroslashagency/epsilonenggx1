"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Report, ReportStatus, User } from '@/app/types/fir';
import { reportService } from '@/app/lib/features/fir/fir.service';
import { getSupabaseBrowserClient } from '@/app/lib/services/supabase-client';

export type FIRFilter = 'All' | 'MyAction' | 'Submitted';
export type FIRView = 'dashboard' | 'reports' | 'categories' | 'analytics';

interface FIRStoreState {
    // Data
    reports: Report[];
    selectedReportId: string | null;

    // UI State
    currentView: FIRView;
    filter: FIRFilter;
    searchQuery: string;

    // Modal State
    farModalOpen: boolean;
    farModalType: 'GOOD' | 'BAD' | null;

    // Loading States
    isLoading: boolean;
    isRefreshing: boolean;
    error: string | null;
}

interface FIRStoreActions {
    // Data Actions
    loadReports: () => Promise<void>;
    refreshReports: () => Promise<void>;
    selectReport: (id: string | null) => void;
    updateReport: (report: Report) => void;

    // UI Actions
    setCurrentView: (view: FIRView) => void;
    setFilter: (filter: FIRFilter) => void;
    setSearchQuery: (query: string) => void;

    // Modal Actions
    openFARModal: (type: 'GOOD' | 'BAD') => void;
    closeFARModal: () => void;

    // Computed
    filteredReports: Report[];
    selectedReport: Report | undefined;
    stats: {
        total: number;
        open: number;
        closed: number;
        pending: number;
        positive: number;
        negative: number;
    };
}

export type FIRStore = FIRStoreState & FIRStoreActions;

export function useFIRStore(currentUser: User | null): FIRStore {
    const supabase = getSupabaseBrowserClient();

    // Core State
    const [reports, setReports] = useState<Report[]>([]);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

    // UI State
    const [currentView, setCurrentView] = useState<FIRView>('dashboard');
    const [filter, setFilter] = useState<FIRFilter>('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [farModalOpen, setFarModalOpen] = useState(false);
    const [farModalType, setFarModalType] = useState<'GOOD' | 'BAD' | null>(null);

    // Loading States
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load Reports
    const loadReports = useCallback(async () => {
        if (!currentUser) return;

        // Only show loading spinner if no data yet
        if (reports.length === 0) {
            setIsLoading(true);
        }
        setError(null);

        try {
            const data = await reportService.getReports();

            // Filter based on user role
            if (currentUser.role !== 'Super Admin') {
                const userReports = data.filter(r =>
                    r.reporter.id === currentUser.id ||
                    r.assignedTo.id === currentUser.id ||
                    r.currentOwner.id === currentUser.id
                );
                setReports(userReports);
            } else {
                setReports(data);
            }
        } catch (err) {
            console.error('Failed to load reports:', err);
            setError('Failed to load reports. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, reports.length]);

    // Refresh Reports (with visual indicator)
    const refreshReports = useCallback(async () => {
        setIsRefreshing(true);
        await loadReports();
        setIsRefreshing(false);
    }, [loadReports]);

    // Select Report
    const selectReport = useCallback((id: string | null) => {
        setSelectedReportId(id);
    }, []);

    // Update Report in local state
    const updateReport = useCallback((updatedReport: Report) => {
        setReports(prev => prev.map(r =>
            r.id === updatedReport.id ? updatedReport : r
        ));
    }, []);

    // Modal Actions
    const openFARModal = useCallback((type: 'GOOD' | 'BAD') => {
        setFarModalType(type);
        setFarModalOpen(true);
    }, []);

    const closeFARModal = useCallback(() => {
        setFarModalOpen(false);
        setFarModalType(null);
    }, []);

    // Computed: Filtered Reports
    const filteredReports = useMemo(() => {
        if (!currentUser) return [];

        let result = reports;

        // Apply filter
        if (filter === 'MyAction') {
            result = result.filter(r =>
                r.currentOwner.id === currentUser.id && r.status !== ReportStatus.Closed
            );
        } else if (filter === 'Submitted') {
            result = result.filter(r => r.reporter.id === currentUser.id);
        }

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.title.toLowerCase().includes(query) ||
                r.description.toLowerCase().includes(query) ||
                r.assignedTo.name.toLowerCase().includes(query) ||
                r.category.toLowerCase().includes(query)
            );
        }

        return result;
    }, [reports, filter, searchQuery, currentUser]);

    // Computed: Selected Report
    const selectedReport = useMemo(() => {
        return reports.find(r => r.id === selectedReportId);
    }, [reports, selectedReportId]);

    // Computed: Stats
    const stats = useMemo(() => {
        const total = reports.length;
        const closed = reports.filter(r => r.status === ReportStatus.Closed).length;
        const open = total - closed;
        const pending = reports.filter(r =>
            r.status === ReportStatus.PersonResponse ||
            r.status === ReportStatus.SuperAdminReview
        ).length;
        const positive = reports.filter(r => r.fir_type === 'GOOD').length;
        const negative = reports.filter(r => r.fir_type === 'BAD').length;

        return { total, open, closed, pending, positive, negative };
    }, [reports]);

    // Real-time Subscription
    useEffect(() => {
        if (!currentUser) return;

        loadReports();

        // Subscribe to real-time changes
        const channel = supabase
            .channel('fir-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'fir_activity' },
                (payload) => {
                    console.log('FIR real-time update:', payload.eventType);
                    refreshReports();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

    return {
        // State
        reports,
        selectedReportId,
        currentView,
        filter,
        searchQuery,
        farModalOpen,
        farModalType,
        isLoading,
        isRefreshing,
        error,

        // Actions
        loadReports,
        refreshReports,
        selectReport,
        updateReport,
        setCurrentView,
        setFilter,
        setSearchQuery,
        openFARModal,
        closeFARModal,

        // Computed
        filteredReports,
        selectedReport,
        stats,
    };
}
