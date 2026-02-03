"use client";

import React from 'react';
import { Report, User } from '@/app/types/fir';
import { ReportCard } from '@/components/fir/ReportCard';
import { ReportDetail } from '@/components/fir/ReportDetail';
import { Plus, Search, ShieldAlert, ChevronRight } from '@/components/fir/Icons';
import { FIRFilter } from '@/app/lib/hooks/useFIRStore';

interface ReportsViewProps {
    reports: Report[];
    filteredReports: Report[];
    selectedReportId: string | null;
    selectedReport: Report | undefined;
    currentUser: User;
    filter: FIRFilter;
    isLoading: boolean;
    searchQuery: string;
    onSelectReport: (id: string | null) => void;
    onUpdateReport: (report: Report) => void;
    onOpenModal: (type: 'GOOD' | 'BAD') => void;
    onFilterChange: (filter: FIRFilter) => void;
    onSearchChange: (query: string) => void;
}

export function ReportsView({
    filteredReports,
    selectedReportId,
    selectedReport,
    currentUser,
    filter,
    isLoading,
    searchQuery,
    onSelectReport,
    onUpdateReport,
    onOpenModal,
    onFilterChange,
    onSearchChange,
}: ReportsViewProps) {
    return (
        <div className="flex flex-col md:flex-row h-full">
            {/* Left Pane: List View */}
            <div
                className={`${selectedReportId ? 'hidden md:flex' : 'flex'
                    } flex-col w-full md:w-[400px] xl:w-[450px] bg-slate-50 dark:bg-gray-900 border-r border-slate-200 dark:border-gray-700 h-full`}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-lg font-bold text-slate-800 dark:text-white">
                            All Reports
                        </h1>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onOpenModal('GOOD')}
                                className="bg-green-600 hover:bg-green-700 text-white p-1.5 rounded-full shadow-lg transition active:scale-90"
                                title="Positive Report"
                            >
                                <Plus size={16} />
                            </button>
                            <button
                                onClick={() => onOpenModal('BAD')}
                                className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-full shadow-lg transition active:scale-90"
                                title="Negative Report"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Filter Buttons */}
                    <FilterTabs filter={filter} onFilterChange={onFilterChange} />

                    {/* Search */}
                    <div className="relative mt-4">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400"
                            size={16}
                        />
                        <input
                            type="text"
                            placeholder="Search reports..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-gray-700 border-transparent focus:bg-white dark:focus:bg-gray-600 focus:border-indigo-300 rounded-lg text-sm outline-none transition duration-200 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-300"
                        />
                    </div>
                </div>

                {/* Report List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isLoading ? (
                        <LoadingSkeleton />
                    ) : filteredReports.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-sm">
                            No reports found matching criteria.
                        </div>
                    ) : (
                        filteredReports.map((report) => (
                            <ReportCard
                                key={report.id}
                                report={report}
                                isSelected={selectedReportId === report.id}
                                onClick={() => onSelectReport(report.id)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Right Pane: Detail View */}
            <div
                className={`${selectedReportId ? 'flex' : 'hidden md:flex'
                    } flex-col flex-1 bg-slate-50/50 dark:bg-gray-950 h-full relative`}
            >
                {selectedReport ? (
                    <div className="h-full flex flex-col">
                        {/* Mobile Back Button */}
                        <div className="md:hidden p-4 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 flex items-center gap-2 sticky top-0 z-30">
                            <button
                                onClick={() => onSelectReport(null)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-full"
                            >
                                <ChevronRight
                                    className="rotate-180 text-slate-800 dark:text-white"
                                    size={24}
                                />
                            </button>
                            <span className="font-semibold text-slate-800 dark:text-white">
                                Report Details
                            </span>
                        </div>

                        <ReportDetail
                            report={selectedReport}
                            onUpdate={onUpdateReport}
                            currentUser={currentUser}
                        />
                    </div>
                ) : (
                    <EmptyDetailState />
                )}
            </div>
        </div>
    );
}

// Sub-components

interface FilterTabsProps {
    filter: FIRFilter;
    onFilterChange: (filter: FIRFilter) => void;
}

function FilterTabs({ filter, onFilterChange }: FilterTabsProps) {
    const tabs: { value: FIRFilter; label: string }[] = [
        { value: 'All', label: 'All' },
        { value: 'Submitted', label: 'Submitted' },
        { value: 'MyAction', label: 'My Action' },
    ];

    return (
        <div className="flex gap-2">
            {tabs.map((tab) => (
                <button
                    key={tab.value}
                    onClick={() => onFilterChange(tab.value)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${filter === tab.value
                            ? 'bg-slate-800 text-white dark:bg-indigo-600'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map((i) => (
                <div
                    key={i}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 animate-pulse"
                >
                    <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
            ))}
        </div>
    );
}

function EmptyDetailState() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-gray-500 p-8">
            <div className="w-20 h-20 bg-slate-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert size={40} className="text-slate-400 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-600 dark:text-gray-400">
                No Report Selected
            </h3>
            <p className="text-center max-w-xs mt-2 text-sm">
                Select a report from the list to view details, audit trail, and take
                action.
            </p>
        </div>
    );
}
