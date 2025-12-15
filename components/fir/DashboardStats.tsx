import React from 'react';
import { FileText, Clock, CheckCircle2, AlertTriangle } from './Icons';
import { Report, ReportStatus, Priority } from '@/app/types/fir';

interface DashboardStatsProps {
    reports: Report[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ reports }) => {
    const stats = [
        {
            label: 'Total Reports',
            value: reports.length,
            icon: FileText,
            color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
            borderColor: 'border-blue-100 dark:border-blue-900'
        },
        {
            label: 'Pending Review',
            value: reports.filter(r => r.status === ReportStatus.UnderReview || r.status === ReportStatus.New).length,
            icon: Clock,
            color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
            borderColor: 'border-yellow-100 dark:border-yellow-900'
        },
        {
            label: 'Resolved',
            value: reports.filter(r => r.status === ReportStatus.Closed).length,
            icon: CheckCircle2,
            color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
            borderColor: 'border-green-100 dark:border-green-900'
        },
        {
            label: 'Critical',
            value: reports.filter(r => r.priority === Priority.High).length,
            icon: AlertTriangle,
            color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
            borderColor: 'border-red-100 dark:border-red-900'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                        <stat.icon size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-0.5">{stat.label}</div>
                        <div className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};
