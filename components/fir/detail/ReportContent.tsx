import React from 'react';
import { Report, ReportStatus, Attachment } from '@/app/types/fir';
import { FileText, CheckCircle2, Paperclip } from 'lucide-react';
import { AudioPlayer } from '../AudioPlayer';

// Description Section
interface DescriptionSectionProps {
    report: Report;
}

export function DescriptionSection({ report }: DescriptionSectionProps) {
    return (
        <section className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-3">
                Description
            </h3>
            <p className="text-slate-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {report.description}
            </p>

            {report.attachments.length > 0 && (
                <AttachmentGrid attachments={report.attachments} />
            )}
        </section>
    );
}

// Attachment Grid
interface AttachmentGridProps {
    attachments: Attachment[];
    columns?: 2 | 3;
}

export function AttachmentGrid({ attachments, columns = 3 }: AttachmentGridProps) {
    return (
        <div className={`mt-4 grid grid-cols-2 md:grid-cols-${columns} gap-3`}>
            {attachments.map(att => (
                <AttachmentItem key={att.id} attachment={att} />
            ))}
        </div>
    );
}

// Individual Attachment Item
interface AttachmentItemProps {
    attachment: Attachment;
}

export function AttachmentItem({ attachment }: AttachmentItemProps) {
    const isAudio = attachment.type === 'audio';
    const isImage = attachment.type === 'image';

    return (
        <div
            className={`relative group rounded-lg overflow-hidden flex items-center justify-center
        ${isAudio
                    ? 'col-span-2 md:col-span-3 w-full bg-transparent p-0'
                    : 'border border-slate-200 dark:border-gray-600 aspect-square bg-slate-100 dark:bg-gray-700'
                }`}
        >
            {isImage ? (
                <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
            ) : isAudio ? (
                <div className="w-full">
                    <AudioPlayer src={attachment.url} />
                </div>
            ) : (
                <div className="text-slate-400 dark:text-gray-500 flex flex-col items-center">
                    <FileText size={24} className="mb-2" />
                    <span className="text-xs">Document</span>
                </div>
            )}
        </div>
    );
}

// Workflow Activity Section
interface WorkflowActivityProps {
    report: Report;
}

export function WorkflowActivity({ report }: WorkflowActivityProps) {
    const hasActivity = report.response_comment || report.final_decision || report.status === ReportStatus.Closed;

    if (!hasActivity) return null;

    return (
        <section className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide mb-1">
                Workflow Activity
            </h3>

            {/* Person Response */}
            {report.response_comment && (
                <PersonResponseCard
                    comment={report.response_comment}
                    attachments={report.response_attachments}
                />
            )}

            {/* Admin Decision */}
            {report.final_decision && (
                <AdminDecisionCard
                    decision={report.final_decision}
                    closedBy={report.closed_by}
                    notes={report.stage3?.notes}
                />
            )}

            {/* Closed Status */}
            {report.status === ReportStatus.Closed && (
                <ClosedStatusCard closedAt={report.closed_at} />
            )}
        </section>
    );
}

// Person Response Card
interface PersonResponseCardProps {
    comment: string;
    attachments?: Attachment[];
}

function PersonResponseCard({ comment, attachments }: PersonResponseCardProps) {
    return (
        <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
            <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-xs uppercase text-blue-700 dark:text-blue-300">
                    Person Response
                </span>
            </div>
            <p className="text-sm text-slate-700 dark:text-gray-300 mt-1">{comment}</p>

            {attachments && attachments.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                    {attachments.map(att => (
                        <ResponseAttachment key={att.id} attachment={att} />
                    ))}
                </div>
            )}
        </div>
    );
}

// Response Attachment (smaller variant)
function ResponseAttachment({ attachment }: { attachment: Attachment }) {
    return (
        <div className="relative group rounded-lg overflow-hidden border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-700">
            {attachment.type === 'image' ? (
                <img src={attachment.url} alt={attachment.name} className="w-full h-32 object-cover" />
            ) : attachment.type === 'audio' ? (
                <div className="p-2">
                    <AudioPlayer src={attachment.url} />
                </div>
            ) : (
                <div className="p-4 flex items-center gap-2 text-slate-500 dark:text-gray-400">
                    <Paperclip size={16} />
                    <span className="text-xs truncate">{attachment.name}</span>
                </div>
            )}
        </div>
    );
}

// Admin Decision Card
interface AdminDecisionCardProps {
    decision: string;
    closedBy?: string;
    notes?: string;
}

function AdminDecisionCard({ decision, closedBy, notes }: AdminDecisionCardProps) {
    const isConfirmed = decision === 'CONFIRMED';

    return (
        <div className={`p-3 rounded-lg border ${isConfirmed
                ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800'
                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800'
            }`}>
            <div className="flex justify-between items-center mb-1">
                <span className={`font-bold text-xs uppercase ${isConfirmed ? 'text-green-700 dark:text-green-300' : 'text-orange-700 dark:text-orange-300'
                    }`}>
                    Admin Decision: {decision}
                </span>
                <span className="text-xs text-slate-500 dark:text-gray-400">by {closedBy}</span>
            </div>
            {notes && <p className="text-sm text-slate-700 dark:text-gray-300 mt-1">{notes}</p>}
        </div>
    );
}

// Closed Status Card
function ClosedStatusCard({ closedAt }: { closedAt?: string }) {
    return (
        <div className="p-3 rounded-lg border bg-slate-50 dark:bg-gray-700/50 border-slate-200 dark:border-gray-600 flex items-center justify-center">
            <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
                <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
                <span className="font-bold text-sm uppercase tracking-wide">Ticket Closed</span>
                {closedAt && (
                    <span className="text-xs text-slate-400 dark:text-gray-500">
                        • {new Date(closedAt).toLocaleDateString()}
                    </span>
                )}
            </div>
        </div>
    );
}
