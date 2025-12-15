import React, { useEffect, useState } from 'react';
import { reportService } from './services/mockService';
import { authService } from './services/authService';
import { Report, ReportStatus, Priority, User } from './types';
import { ReportDetail } from './components/ReportDetail';
import { StatsWidget } from './components/StatsWidget';
import { DashboardStats } from './components/DashboardStats';
import { FARModal } from './components/FARModal';
import { CategoryManager } from './components/CategoryManager';
import { AnalyticsView } from './components/AnalyticsView';
import { Login } from './components/Login';
import {
    Plus, Search, Filter, Mic, ChevronRight,
    ShieldAlert, Menu, XCircle, ArrowUpRight, LogOut, List
} from './components/Icons';
import { ReportCard } from './components/ReportCard';

import { supabase } from './services/supabase';

export default function App() {
    // Auth State
    const [session, setSession] = useState<any>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);

    // App State
    const [reports, setReports] = useState<Report[]>([]);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

    // Modal State
    const [farModalOpen, setFarModalOpen] = useState(false);
    const [farModalType, setFarModalType] = useState<'GOOD' | 'BAD' | null>(null);

    const [filter, setFilter] = useState<'All' | 'MyAction' | 'Submitted'>('All');
    const [loading, setLoading] = useState(false);
    const [currentView, setCurrentView] = useState<'dashboard' | 'reports' | 'categories' | 'analytics'>('dashboard');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        checkSession();
    }, []);

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

    const checkSession = async () => {
        try {
            const currentSession = await authService.getSession();
            setSession(currentSession);
            if (currentSession) {
                const user = await authService.getCurrentUser();
                setCurrentUser(user);
            }
        } catch (error) {
            console.error('Session check failed', error);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLoginSuccess = async () => {
        setAuthLoading(true);
        await checkSession();
    };

    const handleLogout = async () => {
        await authService.signOut();
        setSession(null);
        setCurrentUser(null);
        setReports([]);
        setSelectedReportId(null);
    };

    const loadReports = async () => {
        setLoading(true);
        const data = await reportService.getReports();

        if (currentUser?.role !== 'Super Admin') {
            const userReports = data.filter(r =>
                // Check by ID
                r.reporter.id === currentUser?.id ||
                r.assignedTo.id === currentUser?.id ||
                r.currentOwner.id === currentUser?.id
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

    if (!session || !currentUser) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
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
        <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={closeMobileMenu}
                />
            )}

            {/* Sidebar (Responsive) */}
            <aside className={`
          fixed lg:static inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 border-r border-slate-800 z-50 transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      `}>
                <div className="p-6 flex items-center justify-between lg:justify-start gap-3 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
                            <ShieldAlert size={20} className="text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">FIR Reporter</span>
                    </div>
                    <button onClick={closeMobileMenu} className="lg:hidden text-slate-400 hover:text-white">
                        <XCircle size={24} />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-1 mt-4">
                    <button
                        onClick={() => { setCurrentView('dashboard'); closeMobileMenu(); }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full text-sm font-medium transition-all duration-200
              ${currentView === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <div className={`p-1 rounded ${currentView === 'dashboard' ? 'bg-white/20' : 'bg-slate-800'}`}>
                            <Menu size={16} />
                        </div>
                        Dashboard
                    </button>

                    <button
                        onClick={() => { setCurrentView('reports'); closeMobileMenu(); }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full text-sm font-medium transition-all duration-200
              ${currentView === 'reports' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        <div className={`p-1 rounded ${currentView === 'reports' ? 'bg-white/20' : 'bg-slate-800'}`}>
                            <Filter size={16} />
                        </div>
                        All Reports
                    </button>

                    {currentUser.role === 'Super Admin' && (
                        <button
                            onClick={() => { setCurrentView('categories'); closeMobileMenu(); }}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full text-sm font-medium transition-all duration-200
                  ${currentView === 'categories' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'hover:bg-slate-800 hover:text-white'}`}
                        >
                            <div className={`p-1 rounded ${currentView === 'categories' ? 'bg-white/20' : 'bg-slate-800'}`}>
                                <List size={16} />
                            </div>
                            Categories
                        </button>
                    )}

                    <div className="pt-4 mt-4 border-t border-slate-800">
                        <div className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Analytics</div>
                        <button
                            onClick={() => { setCurrentView('analytics'); closeMobileMenu(); }}
                            className={`flex items-center gap-3 px-4 py-2 rounded-lg w-full text-sm font-medium transition
                ${currentView === 'analytics' ? 'text-white bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                        >
                            <ArrowUpRight size={16} /> Analytics
                        </button>
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3 mb-4">
                        <img src={currentUser.avatar} className="w-10 h-10 rounded-full border-2 border-slate-700" alt="avatar" />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-white truncate">{currentUser.name}</div>
                            <div className="text-xs text-slate-500 truncate">{currentUser.role}</div>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors w-full px-1"
                    >
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-full relative overflow-hidden">

                {/* Top Bar (Mobile Only) */}
                <div className="lg:hidden p-4 bg-white border-b flex justify-between items-center z-30">
                    <div className="flex items-center gap-3 font-bold text-slate-900">
                        <button onClick={toggleMobileMenu} className="p-1 -ml-1 text-slate-600">
                            <Menu size={24} />
                        </button>
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="text-indigo-600" /> FIR Reporter
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleOpenModal('GOOD')} className="p-2 bg-green-600 text-white rounded-full shadow-sm">
                            <Plus size={20} />
                        </button>
                        <button onClick={() => handleOpenModal('BAD')} className="p-2 bg-red-600 text-white rounded-full shadow-sm">
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

                {currentView === 'dashboard' ? (
                    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-10">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex justify-between items-end mb-8">
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
                                    <p className="text-slate-500">Overview of your error reports and pending actions</p>
                                </div>
                                <div className="hidden md:flex gap-3">
                                    <button
                                        onClick={() => handleOpenModal('GOOD')}
                                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-lg shadow-green-200 transition-all active:scale-95"
                                    >
                                        <Plus size={18} /> Positive
                                    </button>
                                    <button
                                        onClick={() => handleOpenModal('BAD')}
                                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-lg shadow-red-200 transition-all active:scale-95"
                                    >
                                        <Plus size={18} /> Negative
                                    </button>
                                </div>
                            </div>

                            <div className="mb-8">
                                <h2 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h2>
                                <div className="grid grid-cols-1">
                                    <React.Suspense fallback={<div>Loading stats...</div>}>
                                        <DashboardStats reports={reports} />
                                    </React.Suspense>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-slate-800 mb-4">Recent Reports</h2>
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    {reports.length === 0 ? (
                                        <div className="p-10 text-center">
                                            <p className="text-slate-500 mb-4">No reports found. Create your first report!</p>
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
                                        <div className="divide-y divide-slate-100">
                                            {reports.slice(0, 5).map(report => (
                                                <div
                                                    key={report.id}
                                                    onClick={() => { setSelectedReportId(report.id); setCurrentView('reports'); }}
                                                    className="p-4 hover:bg-slate-50 cursor-pointer transition flex items-center gap-4"
                                                >
                                                    <div className={`p-2 rounded-lg ${report.priority === Priority.High ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                        <ShieldAlert size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-slate-900 truncate">{report.title}</h3>
                                                        <p className="text-sm text-slate-500 truncate">{report.description}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${report.status === ReportStatus.Closed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                                            {report.status}
                                                        </span>
                                                        <div className="text-xs text-slate-400 mt-1">{new Date(report.reportedAt).toLocaleDateString()}</div>
                                                    </div>
                                                    <ChevronRight size={16} className="text-slate-300" />
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
                        <div className={`${selectedReportId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-[400px] xl:w-[450px] bg-slate-50 border-r border-slate-200 h-full`}>
                            <div className="p-5 border-b bg-white">
                                <div className="flex justify-between items-center mb-4">
                                    <h1 className="text-xl font-bold text-slate-800">All Reports</h1>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenModal('GOOD')}
                                            className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full shadow-lg transition active:scale-90"
                                            title="Positive Report"
                                        >
                                            <Plus size={20} />
                                        </button>
                                        <button
                                            onClick={() => handleOpenModal('BAD')}
                                            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transition active:scale-90"
                                            title="Negative Report"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-2 mb-4">
                                    <button
                                        onClick={() => setFilter('All')}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition ${filter === 'All' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setFilter('Submitted')}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition ${filter === 'Submitted' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        Submitted
                                    </button>
                                    <button
                                        onClick={() => setFilter('MyAction')}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition ${filter === 'MyAction' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                    >
                                        My Action
                                    </button>
                                </div>

                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search reports..."
                                        className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-300 rounded-lg text-sm outline-none transition duration-200"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
                        <div className={`${selectedReportId ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-slate-50/50 h-full relative`}>
                            {selectedReport ? (
                                <div className="h-full flex flex-col">
                                    {/* Mobile Back Button */}
                                    <div className="md:hidden p-4 bg-white border-b flex items-center gap-2 sticky top-0 z-30">
                                        <button onClick={() => setSelectedReportId(null)} className="p-1 hover:bg-slate-100 rounded-full">
                                            <ChevronRight className="rotate-180" size={24} />
                                        </button>
                                        <span className="font-semibold text-slate-800">Report Details</span>
                                    </div>

                                    <ReportDetail
                                        report={selectedReport}
                                        onUpdate={handleUpdateReport}
                                        currentUser={currentUser}
                                    />
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                                    <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                                        <ShieldAlert size={40} className="text-slate-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-600">No Report Selected</h3>
                                    <p className="text-center max-w-xs mt-2 text-sm">Select a report from the list to view details, audit trail, and take action.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : currentView === 'categories' && currentUser.role === 'Super Admin' ? (
                    <CategoryManager />
                ) : (
                    <AnalyticsView reports={reports} />
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
