"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/app/lib/contexts/auth-context';
import { User } from '@/app/types/fir';
import { useFIRStore, FIRView } from '@/app/lib/hooks/useFIRStore';
import { DashboardView, ReportsView } from '@/components/fir/views';
import { CategoryManager } from '@/components/fir/CategoryManager';
import { AnalyticsView } from '@/components/fir/AnalyticsView';
import { FARModal } from '@/components/fir/FARModal';
import { supabase } from '@/components/fir/supabase-adapter';
import { useRouter, useSearchParams } from 'next/navigation';

export default function FIRPage() {
    // Auth State
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    // Fetch user profile
    useEffect(() => {
        if (user?.id && user?.email) {
            const fetchProfile = async () => {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setCurrentUser({
                        id: profile.id,
                        name: profile.full_name || user.email || 'User',
                        role: profile.role || 'Reporter',
                        avatar:
                            profile.avatar_url ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                profile.full_name || 'U'
                            )}&background=random`,
                    });
                }
            };
            fetchProfile();
        }
    }, [user]);

    // FIR Store - centralized state management
    const store = useFIRStore(currentUser);

    // Sync URL with view state
    useEffect(() => {
        const viewParam = searchParams.get('view') as FIRView | null;
        if (viewParam && ['dashboard', 'reports', 'categories', 'analytics'].includes(viewParam)) {
            store.setCurrentView(viewParam);
        }
    }, [searchParams]);

    // Update URL when view changes
    const handleViewChange = (view: FIRView) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', view);
        router.push(`?${params.toString()}`);
        store.setCurrentView(view);
    };

    // Handle report submission from modal
    const handleReportSubmitted = () => {
        store.loadReports();
        handleViewChange('reports');
    };

    // Loading state
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Not authenticated
    if (!isAuthenticated || !currentUser) {
        return (
            <div className="p-10 text-center">
                Please log in to access FIR Reporter.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-slate-100 dark:bg-gray-900 overflow-hidden font-sans rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">
            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-gray-950">
                {store.currentView === 'dashboard' && (
                    <DashboardView
                        reports={store.reports}
                        onOpenModal={store.openFARModal}
                        onSelectReport={store.selectReport}
                        onNavigateToReports={() => handleViewChange('reports')}
                    />
                )}

                {store.currentView === 'reports' && (
                    <ReportsView
                        reports={store.reports}
                        filteredReports={store.filteredReports}
                        selectedReportId={store.selectedReportId}
                        selectedReport={store.selectedReport}
                        currentUser={currentUser}
                        filter={store.filter}
                        isLoading={store.isLoading}
                        searchQuery={store.searchQuery}
                        onSelectReport={store.selectReport}
                        onUpdateReport={store.updateReport}
                        onOpenModal={store.openFARModal}
                        onFilterChange={store.setFilter}
                        onSearchChange={store.setSearchQuery}
                    />
                )}

                {store.currentView === 'categories' && currentUser.role === 'Super Admin' && (
                    <div className="h-full overflow-y-auto p-6">
                        <CategoryManager />
                    </div>
                )}

                {store.currentView === 'analytics' && (
                    <div className="h-full overflow-y-auto p-6">
                        <AnalyticsView reports={store.reports} />
                    </div>
                )}
            </main>

            {/* FAR Modal */}
            <FARModal
                isOpen={store.farModalOpen}
                onClose={store.closeFARModal}
                type={store.farModalType}
                onReportSubmitted={handleReportSubmitted}
                currentUser={currentUser}
            />
        </div>
    );
}
