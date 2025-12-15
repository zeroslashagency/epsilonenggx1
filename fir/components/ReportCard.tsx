import React from 'react';
import { Report, ReportStatus, Priority } from '../types';
import { ShieldAlert, Mic, ArrowUpRight, CheckCircle2, Clock, AlertTriangle } from './Icons';

interface ReportCardProps {
    report: Report;
    isSelected: boolean;
    onClick: () => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report, isSelected, onClick }) => {
    // Determine color scheme based on priority or type
    const getTheme = () => {
        if (report.fir_type === 'GOOD') return 'bg-gradient-to-br from-emerald-100 to-teal-100 hover:shadow-lg';
        switch (report.priority) {
            case Priority.High: return 'bg-gradient-to-br from-purple-200 via-fuchsia-200 to-pink-200 hover:shadow-lg'; // Vivid Purple/Phone style
            case Priority.Medium: return 'bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-100 hover:shadow-lg'; // Vivid Yellow
            case Priority.Low: return 'bg-gradient-to-br from-blue-200 via-cyan-200 to-sky-200 hover:shadow-lg'; // Vivid Blue
            default: return 'bg-white border-slate-100 hover:border-slate-200';
        }
    };

    const themeClass = getTheme();

    // Status badge style
    const getStatusColor = () => {
        if (report.status === ReportStatus.Closed) return 'text-green-600 font-bold';
        if (report.status === ReportStatus.New || report.status === ReportStatus.Reported) return 'text-blue-600 font-bold';
        return 'text-amber-700 font-bold';
    };

    const getPriorityBadgeColor = () => {
        // Solid pill colors for badges
        if (report.fir_type === 'GOOD') return 'bg-emerald-500 text-white';
        switch (report.priority) {
            case Priority.High: return 'bg-red-500 text-white shadow-red-500/30';
            case Priority.Medium: return 'bg-orange-400 text-white shadow-orange-400/30';
            case Priority.Low: return 'bg-blue-500 text-white shadow-blue-500/30';
            default: return 'bg-slate-500 text-white';
        }
    };

    return (
        <div
            onClick={onClick}
            className={`
        relative rounded-[2.5rem] cursor-pointer transition-all duration-500 ease-in-out group overflow-hidden
        ${isSelected
                    ? 'bg-slate-900 shadow-2xl scale-[1.02] z-10 p-6' // Selected: Dark Mode
                    : `${themeClass} shadow-md hover:scale-[1.01] hover:shadow-xl p-5 border-0` // Standard: Vivid Gradient
                }
      `}
        >
            {/* Top Row: Title Left, Avatar Right */}
            <div className="flex justify-between items-start mb-4">
                <h3 className={`font-bold leading-tight line-clamp-2 text-[22px] tracking-tight max-w-[80%] ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {report.title}
                </h3>

                <div className="shrink-0">
                    {report.reporter.avatar ? (
                        <img src={report.reporter.avatar} className="w-10 h-10 rounded-full border-2 border-white/50 shadow-sm object-cover" alt="" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center text-sm font-bold border-2 border-white/50">
                            {report.reporter.name.charAt(0)}
                        </div>
                    )}
                </div>
            </div>

            {/* Expanded Content (Details) */}
            <div className={`
        transition-all duration-500 ease-in-out overflow-hidden
        ${isSelected ? 'max-h-[200px] opacity-100 mb-4' : 'max-h-0 opacity-0 mb-0'}
      `}>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                    {report.description}
                </p>

                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Submitted Person</span>
                        <span className="text-xs font-bold text-white">{report.reporter.name}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 text-right">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Assigned Person</span>
                        <span className="text-xs font-bold text-white">{report.assignedTo?.name || report.currentOwner?.name || 'Unassigned'}</span>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Priority/Date Left, Status Right */}
            <div className="flex items-center justify-between mt-auto pt-1">
                <div className="flex items-center gap-2">
                    {/* Priority Pill */}
                    <span className={`px-4 py-1 rounded-full text-xs font-bold shadow-lg shadow-black/5 ${getPriorityBadgeColor()}`}>
                        {report.priority}
                    </span>
                    {/* Date */}
                    <span className={`text-sm font-medium ${isSelected ? 'text-slate-500' : 'text-slate-700/80'}`}>
                        {new Date(report.reportedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                </div>

                {/* Status Text (No Background, just colored text) */}
                <span className={`text-sm tracking-wide ${isSelected ? 'text-white' : getStatusColor()}`}>
                    {report.status}
                </span>
            </div>

            {/* Decorative glass overlay for selected state */}
            {isSelected && (
                <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
            )}
        </div>
    );
};
