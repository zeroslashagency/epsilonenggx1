"use client";

import React from 'react';
import { Report, Priority, ReportStatus } from '@/app/types/fir';
import { DashboardStats } from '@/components/fir/DashboardStats';
import { Plus, ShieldAlert, ChevronRight } from '@/components/fir/Icons';

interface DashboardViewProps {
    reports: Report[];
    onOpenModal: (type: 'GOOD' | 'BAD') => void;
    onSelectReport: (id: string) => void;
    onNavigateToReports: () => void;
    canCreate?: boolean;
}

export function DashboardView({
    reports,
    onOpenModal,
    onSelectReport,
    onNavigateToReports,
    canCreate = true,
}: DashboardViewProps) {
    const handleReportClick = (reportId: string) => {
        onSelectReport(reportId);
        onNavigateToReports();
    };

    return (
        <div className="h-full overflow-y-auto p-6 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                            Dashboard
                        </h1>
                        <p className="text-slate-500 dark:text-gray-400 text-sm">
                            Overview of your error reports and pending actions
                        </p>
                    </div>
                    {canCreate && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => onOpenModal('GOOD')}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95"
                            >
                                <Plus size={16} /> Positive
                            </button>
                            <button
                                onClick={() => onOpenModal('BAD')}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-all active:scale-95"
                            >
                                <Plus size={16} /> Negative
                            </button>
                        </div>
                    )}
                </div>

                {/* Quick Actions / Stats */}
                <div className="mb-8">
                    <h2 className="text-base font-semibold text-slate-800 dark:text-gray-200 mb-3">
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-1">
                        <React.Suspense
                            fallback={
                                <div className="text-slate-500 dark:text-gray-400">
                                    Loading stats...
                                </div>
                            }
                        >
                            <DashboardStats reports={reports} />
                        </React.Suspense>
                    </div>
                </div>

                {/* Recent Reports */}
                <div>
                    <h2 className="text-base font-semibold text-slate-800 dark:text-gray-200 mb-3">
                        Recent Reports
                    </h2>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        {reports.length === 0 ? (
                            <EmptyState onOpenModal={onOpenModal} canCreate={canCreate} />
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-gray-700">
                                {reports.slice(0, 5).map((report) => (
                                    <ReportRow
                                        key={report.id}
                                        report={report}
                                        onClick={() => handleReportClick(report.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Sub-components for cleaner code

interface ReportRowProps {
    report: Report;
    onClick: () => void;
}

function ReportRow({ report, onClick }: ReportRowProps) {
    const isPriorityHigh = report.priority === Priority.High;
    const isClosed = report.status === ReportStatus.Closed;

    return (
        <div
            onClick={onClick}
            className="p-4 hover:bg-slate-50 dark:hover:bg-gray-700 cursor-pointer transition flex items-center gap-4"
        >
            <div
                className={`p-2 rounded-lg ${isPriorityHigh
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        : 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400'
                    }`}
            >
                <ShieldAlert size={20} />
            </div>

            <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                    {report.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-gray-400 truncate">
                    {report.description}
                </p>
            </div>

            <div className="text-right">
                <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isClosed
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                        }`}
                >
                    {report.status}
                </span>
                <div className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                    {new Date(report.reportedAt).toLocaleDateString()}
                </div>
            </div>

            <ChevronRight size={16} className="text-slate-300 dark:text-gray-600" />
        </div>
    );
}

interface EmptyStateProps {
    onOpenModal: (type: 'GOOD' | 'BAD') => void;
    canCreate: boolean;
}

function EmptyState({ onOpenModal, canCreate }: EmptyStateProps) {
    return (
        <div className="p-10 text-center">
            <p className="text-slate-500 dark:text-gray-400 mb-4">
                {canCreate ? 'No reports found. Create your first report!' : 'No reports found.'}
            </p>
            {canCreate && (
                <div className="flex justify-center gap-3">
                    <button
                        onClick={() => onOpenModal('GOOD')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                        + Positive
                    </button>
                    <button
                        onClick={() => onOpenModal('BAD')}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                        + Negative
                    </button>
                </div>
            )}
        </div>
    );
}
