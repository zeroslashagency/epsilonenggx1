
"use client"

import React, { useEffect, useState } from 'react';
import { reportService } from '@/app/lib/services/fir-service';
import { useAuth } from '@/app/lib/contexts/auth-context';
import { Report, ReportStatus, Priority, User } from '@/app/types/fir';
import { ReportDetail } from '@/components/fir/ReportDetail';
import { DashboardStats } from '@/components/fir/DashboardStats';
import { FARModal } from '@/components/fir/FARModal';
import { CategoryManager } from '@/components/fir/CategoryManager';
import { AnalyticsView } from '@/components/fir/AnalyticsView';
import {
    Plus, Search, Filter, Menu, XCircle, ArrowUpRight, LogOut, List, ShieldAlert,
    ChevronRight // Added generic icon for back button
} from '@/components/fir/Icons';
import { ReportCard } from '@/components/fir/ReportCard';
import { supabase } from '@/components/fir/supabase-adapter';
import { useRouter, useSearchParams } from 'next/navigation';
// ZohoLayout moved to layout.tsx

export default function FIRPage() {
    // Auth State from Main Context
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();

    // App State
    const [reports, setReports] = useState<Report[]>([]);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

    // Modal State
    const [farModalOpen, setFarModalOpen] = useState(false);
    const [farModalType, setFarModalType] = useState<'GOOD' | 'BAD' | null>(null);

    const [filter, setFilter] = useState<'All' | 'MyAction' | 'Submitted'>('All');
    const [loading, setLoading] = useState(false);

    // Initialize view from URL or default to dashboard
    const viewParam = searchParams.get('view');
    const [currentView, setCurrentViewState] = useState<'dashboard' | 'reports' | 'categories' | 'analytics'>('dashboard');

    useEffect(() => {
        if (viewParam && ['dashboard', 'reports', 'categories', 'analytics'].includes(viewParam)) {
            setCurrentViewState(viewParam as any);
        } else {
            setCurrentViewState('dashboard');
        }
    }, [viewParam]);

    const setCurrentView = (view: 'dashboard' | 'reports' | 'categories' | 'analytics') => {
        // Update URL to reflect state change
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', view);
        router.push(`?${params.toString()}`);
        setCurrentViewState(view);
    };

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Adapt AuthContext user to FIR User type
    useEffect(() => {
        if (user && user.email) { // Check user.email existence
            // We need full profile details (name, avatar) which might not be in basic auth context user object fully
            // But let's construct a basic one or fetch profile if needed.
            // fir-service relies on strict User shape.
            // Let's fetch profile similar to how authService.getCurrentUser did
            // asking supabase directly here is fine or using a helper.

            const fetchProfile = async () => {
                if (!user.id) return;
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
                        avatar: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'U')}&background=random`
                    });
                }
            };
            fetchProfile();
        }
    }, [user]);

    // Real-time Subscription
    useEffect(() => {
        if (!currentUser) return;

        loadReports();

        // Subscribe to changes
        const channel = supabase
            .channel('public:fir_activity')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'fir_activity' },
                (payload) => {
                    console.log('Real-time update received:', payload);
                    loadReports();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

    const loadReports = async () => {
        if (!currentUser) return;
        // Only show loading if we don't have reports yet to prevent flickering
        if (reports.length === 0) {
            setLoading(true);
        }

        const data = await reportService.getReports();

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
        setLoading(false);
    };

    const handleOpenModal = (type: 'GOOD' | 'BAD') => {
        setFarModalType(type);
        setFarModalOpen(true);
    };

    const handleReportSubmitted = () => {
        loadReports();
        setCurrentView('reports');
    };

    const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
    const closeMobileMenu = () => setMobileMenuOpen(false);

    const handleUpdateReport = (updated: Report) => {
        setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isAuthenticated || !currentUser) {
        return <div className="p-10 text-center">Please log in to access FIR Reporter.</div>;
    }

    const filteredReports = reports.filter(r => {
        if (filter === 'MyAction') {
            return r.currentOwner.id === currentUser.id && r.status !== ReportStatus.Closed;
        }
        if (filter === 'Submitted') {
            return r.reporter.id === currentUser.id;
        }
        return true;
    });

    const selectedReport = reports.find(r => r.id === selectedReportId);

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-slate-100 dark:bg-gray-900 overflow-hidden font-sans rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm">

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-gray-950">

                {currentView === 'dashboard' ? (
                    <div className="h-full overflow-y-auto p-6 md:p-8">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex justify-between items-end mb-8">
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Dashboard</h1>
                                    <p className="text-slate-500 dark:text-gray-400 text-sm">Overview of your error reports and pending actions</p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleOpenModal('GOOD')}
                                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95"
                                    >
                                        <Plus size={16} /> Positive
                                    </button>
                                    <button
                                        onClick={() => handleOpenModal('BAD')}
                                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95"
                                    >
                                        <Plus size={16} /> Negative
                                    </button>
                                </div>
                            </div>

                            <div className="mb-8">
                                <h2 className="text-base font-semibold text-slate-800 dark:text-gray-200 mb-3">Quick Actions</h2>
                                <div className="grid grid-cols-1">
                                    <React.Suspense fallback={<div className="text-slate-500 dark:text-gray-400">Loading stats...</div>}>
                                        <DashboardStats reports={reports} />
                                    </React.Suspense>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-base font-semibold text-slate-800 dark:text-gray-200 mb-3">Recent Reports</h2>
                                <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
                                    {reports.length === 0 ? (
                                        <div className="p-10 text-center">
                                            <p className="text-slate-500 dark:text-gray-400 mb-4">No reports found. Create your first report!</p>
                                            <div className="flex justify-center gap-3">
                                                <button
                                                    onClick={() => handleOpenModal('GOOD')}
                                                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                                >
                                                    + Positive
                                                </button>
                                                <button
                                                    onClick={() => handleOpenModal('BAD')}
                                                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                                                >
                                                    + Negative
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100 dark:divide-gray-700">
                                            {reports.slice(0, 5).map(report => (
                                                <div
                                                    key={report.id}
                                                    onClick={() => { setSelectedReportId(report.id); setCurrentView('reports'); }}
                                                    className="p-4 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer transition flex items-center gap-4"
                                                >
                                                    <div className={`p-2 rounded-lg ${report.priority === Priority.High ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400'}`}>
                                                        <ShieldAlert size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">{report.title}</h3>
                                                        <p className="text-sm text-slate-500 dark:text-gray-400 truncate">{report.description}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${report.status === ReportStatus.Closed ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'}`}>
                                                            {report.status}
                                                        </span>
                                                        <div className="text-xs text-slate-400 dark:text-gray-500 mt-1">{new Date(report.reportedAt).toLocaleDateString()}</div>
                                                    </div>
                                                    <ChevronRight size={16} className="text-slate-300 dark:text-gray-600" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : currentView === 'reports' ? (
                    /* Reports View (Split Pane) */
                    <div className="flex flex-col md:flex-row h-full">
                        {/* Left Pane: List View */}
                        <div className={`${selectedReportId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[400px] xl:w-[450px] bg-slate-50 dark:bg-gray-900 border-r border-slate-200 dark:border-gray-700 h-full`}>
                            <div className="p-4 border-b border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex justify-between items-center mb-4">
                                    <h1 className="text-lg font-bold text-slate-800 dark:text-white">All Reports</h1>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenModal('GOOD')}
                                            className="bg-green-600 hover:bg-green-700 text-white p-1.5 rounded-full shadow-lg transition active:scale-90"
                                            title="Positive Report"
                                        >
                                            <Plus size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleOpenModal('BAD')}
                                            className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-lg transition active:scale-90"
                                            title="Negative Report"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-2 mb-4">
                                    <button
                                        onClick={() => setFilter('All')}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${filter === 'All' ? 'bg-slate-800 text-white dark:bg-indigo-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setFilter('Submitted')}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${filter === 'Submitted' ? 'bg-slate-800 text-white dark:bg-indigo-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
                                    >
                                        Submitted
                                    </button>
                                    <button
                                        onClick={() => setFilter('MyAction')}
                                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${filter === 'MyAction' ? 'bg-slate-800 text-white dark:bg-indigo-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
                                    >
                                        My Action
                                    </button>
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search reports..."
                                        className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-gray-700 border-transparent focus:bg-white dark:focus:bg-gray-600 focus:border-indigo-300 rounded-lg text-sm outline-none transition duration-200 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-300"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {loading ? (
                                    <div className="text-center py-10 text-slate-400">Loading...</div>
                                ) : filteredReports.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 text-sm">No reports found matching criteria.</div>
                                ) : (
                                    filteredReports.map(report => (
                                        <ReportCard
                                            key={report.id}
                                            report={report}
                                            isSelected={selectedReportId === report.id}
                                            onClick={() => setSelectedReportId(report.id)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Right Pane: Detail View */}
                        <div className={`${selectedReportId ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-slate-50/50 dark:bg-gray-950 h-full relative`}>
                            {selectedReport ? (
                                <div className="h-full flex flex-col">
                                    {/* Mobile Back Button */}
                                    <div className="md:hidden p-4 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 flex items-center gap-2 sticky top-0 z-30">
                                        <button onClick={() => setSelectedReportId(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full">
                                            <ChevronRight className="rotate-180 text-slate-800 dark:text-white" size={24} />
                                        </button>
                                        <span className="font-semibold text-slate-800 dark:text-white">Report Details</span>
                                    </div>

                                    <ReportDetail
                                        report={selectedReport}
                                        onUpdate={handleUpdateReport}
                                        currentUser={currentUser}
                                    />
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-gray-500 p-8">
                                    <div className="w-20 h-20 bg-slate-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                        <ShieldAlert size={40} className="text-slate-400 dark:text-gray-600" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-600 dark:text-gray-400">No Report Selected</h3>
                                    <p className="text-center max-w-xs mt-2 text-sm">Select a report from the list to view details, audit trail, and take action.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : currentView === 'categories' && currentUser.role === 'Super Admin' ? (
                    <div className="h-full overflow-y-auto p-6">
                        <CategoryManager />
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto p-6">
                        <AnalyticsView reports={reports} />
                    </div>
                )}

            </main>

            <FARModal
                isOpen={farModalOpen}
                onClose={() => setFarModalOpen(false)}
                type={farModalType}
                onReportSubmitted={handleReportSubmitted}
                currentUser={currentUser}
            />

        </div>
    );
}
