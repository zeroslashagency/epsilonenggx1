import React from 'react';
import { Report, ReportStatus, Priority, User } from '@/app/types/fir';
import { CheckCircle2, User as UserIcon, Clock } from '../Icons';

// Priority Badge Component
export function PriorityBadge({ priority }: { priority: Priority }) {
    const colors = {
        [Priority.High]: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        [Priority.Medium]: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
        [Priority.Low]: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${colors[priority]}`}>
            {priority}
        </span>
    );
}

// Category Badge Component
export function CategoryBadge({ category }: { category: string }) {
    return (
        <span className="px-2 py-0.5 bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-gray-600 rounded text-xs font-medium">
            {category}
        </span>
    );
}

// Workflow Stepper Component
interface WorkflowStepperProps {
    report: Report;
    currentUser: User;
}

export function WorkflowStepper({ report, currentUser }: WorkflowStepperProps) {
    const steps = [
        {
            id: ReportStatus.Reported,
            label: 'Submitted By',
            name: report.reporter.name
        },
        {
            id: ReportStatus.PersonResponse,
            label: 'Assigned By',
            name: report.assignedTo?.name || report.currentOwner.name
        },
        {
            id: ReportStatus.SuperAdminReview,
            label: 'Reviewed By',
            name: report.stage3?.by || 'Super Admin'
        },
        {
            id: ReportStatus.Closed,
            label: 'Closed By',
            name: report.closed_by || ''
        }
    ];

    const currentStepIndex = steps.findIndex(s => s.id === report.status);
    const level = currentStepIndex !== -1 ? currentStepIndex + 1 : (report.status === ReportStatus.Closed ? 4 : 1);

    return (
        <div className="flex items-center w-full mb-6 overflow-x-auto pt-2">
            {steps.map((step, idx) => {
                const stepNum = idx + 1;
                const isActive = stepNum === level;
                const isCompleted = stepNum < level || report.status === ReportStatus.Closed;

                return (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center relative z-10 min-w-[100px]">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 mb-1
                ${isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' :
                                    isActive ? 'bg-white dark:bg-gray-800 border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400' :
                                        'bg-slate-100 dark:bg-gray-700 border-slate-300 dark:border-gray-600 text-slate-400 dark:text-gray-500'}`}>
                                {isCompleted ? <CheckCircle2 size={16} /> : stepNum}
                            </div>

                            <span className={`text-[10px] uppercase font-bold tracking-wider ${isActive || isCompleted ? 'text-indigo-900 dark:text-indigo-300' : 'text-slate-400 dark:text-gray-500'}`}>
                                {step.label}
                            </span>
                            <span className={`text-xs font-semibold truncate max-w-[90px] ${isActive || isCompleted ? 'text-slate-800 dark:text-white' : 'text-slate-300 dark:text-gray-600'}`}>
                                {step.name}
                            </span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-2 -mt-6 transition-colors duration-300 min-w-[20px] ${isCompleted ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-gray-700'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// Report Header Component
interface ReportHeaderProps {
    report: Report;
}

export function ReportHeader({ report }: ReportHeaderProps) {
    return (
        <div className="flex justify-between items-start mb-4">
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-slate-400 dark:text-gray-400">
                        {report.id.substring(0, 8)}...
                    </span>
                    <PriorityBadge priority={report.priority} />
                    <CategoryBadge category={report.category} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                    {report.title}
                </h1>
            </div>
            <div className="text-right">
                <div className="text-xs text-slate-500 dark:text-gray-400 mb-1">Status</div>
                <div className={`text-sm font-bold ${report.status === ReportStatus.Closed
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}>
                    {report.status}
                </div>
            </div>
        </div>
    );
}

// Report Meta Info Component
interface ReportMetaProps {
    report: Report;
}

export function ReportMeta({ report }: ReportMetaProps) {
    return (
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-gray-700/50 p-3 rounded-lg border border-slate-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
                <UserIcon size={16} />
                <span>
                    Created By: <strong className="text-slate-700 dark:text-gray-200">{report.reporter.name}</strong>
                </span>
            </div>
            <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>{new Date(report.reportedAt).toLocaleDateString()}</span>
            </div>
        </div>
    );
}
