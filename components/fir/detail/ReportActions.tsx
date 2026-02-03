import React, { useState } from 'react';
import { Report, ReportStatus, User, Attachment } from '@/app/types/fir';
import { CheckCircle2, XCircle, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { Camera, Mic } from 'lucide-react';
import { reportService } from '@/app/lib/features/fir/fir.service';
import { supabase } from '../supabase-adapter';
import { AudioRecorder } from '../AudioRecorder';
import { toast } from 'sonner';

interface ReportActionsProps {
    report: Report;
    currentUser: User;
    onUpdate: (report: Report) => void;
}

export function ReportActions({ report, currentUser, onUpdate }: ReportActionsProps) {
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [responseAttachments, setResponseAttachments] = useState<Attachment[]>([]);
    const [uploading, setUploading] = useState(false);

    // Check if action bar should be visible
    const canRespond = report.status === ReportStatus.PersonResponse || report.status === ReportStatus.Reported;
    const canAdminReview = report.status === ReportStatus.SuperAdminReview && currentUser.role === 'Super Admin';

    const userIsAssigned = report.assignedTo.id === currentUser.id || report.assignedTo.name === currentUser.name;
    const shouldShowActionBar = report.status !== ReportStatus.Closed && (
        ((report.status === ReportStatus.PersonResponse || report.status === ReportStatus.Reported) && userIsAssigned) ||
        canAdminReview
    );

    if (!shouldShowActionBar) return null;

    // File upload
    const uploadFile = async (file: File): Promise<string | null> => {
        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('attachments').getPublicUrl(fileName);
            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading file:', error);
            toast.error('Failed to upload file');
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const publicUrl = await uploadFile(file);
            if (publicUrl) {
                setResponseAttachments(prev => [...prev, {
                    id: `att_${Date.now()}`,
                    name: file.name,
                    type: file.type.startsWith('image') ? 'image' : 'document',
                    url: publicUrl
                }]);
            }
        }
    };

    const handleAudioSave = async (file: File) => {
        const publicUrl = await uploadFile(file);
        if (publicUrl) {
            setResponseAttachments(prev => [...prev, {
                id: `att_${Date.now()}`,
                name: 'Voice Note',
                type: 'audio',
                url: publicUrl
            }]);
        }
    };

    const removeAttachment = (id: string) => {
        setResponseAttachments(prev => prev.filter(a => a.id !== id));
    };

    // Stage 2: Person Response
    const handleResponse = async (accepted: boolean) => {
        if (!accepted && !comment.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }

        setIsSubmitting(true);
        try {
            await reportService.submitResponse(report.id, accepted, comment, responseAttachments);
            const updated = await reportService.getReportById(report.id);
            if (updated) onUpdate(updated);

            toast.success(accepted ? 'Response accepted and sent for review' : 'Response submitted');
            setComment('');
            setResponseAttachments([]);
            setShowRejectInput(false);
        } catch (e) {
            console.error(e);
            toast.error('Failed to submit response');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Stage 3: Admin Review
    const handleAdminReview = async (decision: 'CONFIRM' | 'SEND_BACK') => {
        if (decision === 'SEND_BACK' && !comment.trim()) {
            toast.error('Please provide a reason for sending back');
            return;
        }

        setIsSubmitting(true);
        try {
            await reportService.adminReview(report.id, decision, comment, currentUser);
            const updated = await reportService.getReportById(report.id);
            if (updated) onUpdate(updated);

            toast.success(decision === 'CONFIRM' ? 'Report confirmed and closed' : 'Report sent back for revision');
            setComment('');
        } catch (e) {
            console.error(e);
            toast.error('Failed to review report');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-slate-200 dark:border-gray-700 sticky bottom-0 z-20">
            {/* Comment Input */}
            <div className="flex gap-2 mb-3 flex-col">
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={showRejectInput ? "Reason for rejection (Required)..." : "Add a note..."}
                    className={`w-full px-3 py-2 bg-slate-50 dark:bg-gray-700 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20 transition-colors dark:text-white dark:placeholder-gray-400
            ${showRejectInput ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 focus:ring-red-500' : 'border-slate-200 dark:border-gray-600'}`}
                />

                {/* Attachment Preview */}
                {showRejectInput && (
                    <AttachmentPreview
                        attachments={responseAttachments}
                        onRemove={removeAttachment}
                        onAudioSave={handleAudioSave}
                        onFileUpload={handleFileUpload}
                        uploading={uploading}
                    />
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end items-center gap-2">
                {/* Stage 2: Person Response Buttons */}
                {canRespond && userIsAssigned && (
                    <PersonResponseButtons
                        showRejectInput={showRejectInput}
                        setShowRejectInput={setShowRejectInput}
                        isSubmitting={isSubmitting}
                        comment={comment}
                        onResponse={handleResponse}
                    />
                )}

                {/* Stage 3: Admin Review Buttons */}
                {canAdminReview && (
                    <AdminReviewButtons
                        isSubmitting={isSubmitting}
                        onReview={handleAdminReview}
                    />
                )}
            </div>
        </div>
    );
}

// Attachment Preview Sub-component
interface AttachmentPreviewProps {
    attachments: Attachment[];
    onRemove: (id: string) => void;
    onAudioSave: (file: File) => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    uploading: boolean;
}

function AttachmentPreview({ attachments, onRemove, onAudioSave, onFileUpload, uploading }: AttachmentPreviewProps) {
    return (
        <div className="space-y-3">
            {attachments.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-2">
                    {attachments.map(att => (
                        <div key={att.id} className="relative flex-shrink-0 w-20 h-20 bg-slate-100 dark:bg-gray-700 rounded-lg border border-slate-200 dark:border-gray-600 flex items-center justify-center group">
                            {att.type === 'image' ? (
                                <img src={att.url} className="w-full h-full object-cover rounded-lg" alt="" />
                            ) : (
                                <Mic size={20} className="text-slate-400 dark:text-gray-300" />
                            )}
                            <button
                                onClick={() => onRemove(att.id)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex gap-2">
                <AudioRecorder onSave={onAudioSave} />
                <label className="cursor-pointer p-2 rounded-full bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-600 dark:text-gray-300 transition-colors">
                    <Camera size={20} />
                    <input type="file" accept="image/*" className="hidden" onChange={onFileUpload} disabled={uploading} />
                </label>
            </div>
        </div>
    );
}

// Person Response Buttons
interface PersonResponseButtonsProps {
    showRejectInput: boolean;
    setShowRejectInput: (show: boolean) => void;
    isSubmitting: boolean;
    comment: string;
    onResponse: (accepted: boolean) => void;
}

function PersonResponseButtons({ showRejectInput, setShowRejectInput, isSubmitting, comment, onResponse }: PersonResponseButtonsProps) {
    if (showRejectInput) {
        return (
            <>
                <button
                    onClick={() => setShowRejectInput(false)}
                    className="px-4 py-2 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg text-sm font-medium"
                >
                    Cancel
                </button>
                <button
                    onClick={() => onResponse(false)}
                    disabled={isSubmitting || !comment.trim()}
                    className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-semibold shadow-md disabled:opacity-50"
                >
                    Confirm Reject
                </button>
            </>
        );
    }

    return (
        <>
            <button
                onClick={() => setShowRejectInput(true)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-lg text-sm font-semibold transition flex items-center gap-2"
            >
                <XCircle size={16} /> Reject
            </button>
            <button
                onClick={() => onResponse(true)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 dark:shadow-none rounded-lg text-sm font-semibold transition flex items-center gap-2"
            >
                <CheckCircle2 size={16} /> Accept
            </button>
        </>
    );
}

// Admin Review Buttons
interface AdminReviewButtonsProps {
    isSubmitting: boolean;
    onReview: (decision: 'CONFIRM' | 'SEND_BACK') => void;
}

function AdminReviewButtons({ isSubmitting, onReview }: AdminReviewButtonsProps) {
    return (
        <>
            <button
                onClick={() => onReview('SEND_BACK')}
                disabled={isSubmitting}
                className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 border border-orange-200 dark:border-orange-800 rounded-lg text-sm font-semibold transition flex items-center gap-2"
            >
                <RotateCcw size={16} /> Send Back
            </button>
            <button
                onClick={() => onReview('CONFIRM')}
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 shadow-md rounded-lg text-sm font-semibold transition flex items-center gap-2"
            >
                <ShieldCheck size={16} /> Confirm & Close
            </button>
        </>
    );
}
