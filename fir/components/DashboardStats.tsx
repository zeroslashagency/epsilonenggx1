import React from 'react';
import { FileText, Clock, CheckCircle2, AlertTriangle } from './Icons';
import { Report, ReportStatus, Priority } from '../types';

interface DashboardStatsProps {
    reports: Report[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ reports }) => {
    const stats = [
        {
            label: 'Total Reports',
            value: reports.length,
            icon: FileText,
            color: 'bg-blue-100 text-blue-600',
            borderColor: 'border-blue-100'
        },
        {
            label: 'Pending Review',
            value: reports.filter(r => r.status === ReportStatus.UnderReview || r.status === ReportStatus.New).length,
            icon: Clock,
            color: 'bg-yellow-100 text-yellow-600',
            borderColor: 'border-yellow-100'
        },
        {
            label: 'Resolved',
            value: reports.filter(r => r.status === ReportStatus.Closed).length,
            icon: CheckCircle2,
            color: 'bg-green-100 text-green-600',
            borderColor: 'border-green-100'
        },
        {
            label: 'Critical',
            value: reports.filter(r => r.priority === Priority.High).length,
            icon: AlertTriangle,
            color: 'bg-red-100 text-red-600',
            borderColor: 'border-red-100'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
                <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 transition-transform hover:scale-[1.02]">
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                        <stat.icon size={24} />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-500 mb-0.5">{stat.label}</div>
                        <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};
