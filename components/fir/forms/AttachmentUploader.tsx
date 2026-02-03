import React from 'react';
import { Camera, Mic, Paperclip, X } from 'lucide-react';
import { AudioPlayer } from '../AudioPlayer';
import { AudioRecorder } from '../AudioRecorder';
import { Attachment } from '@/app/types/fir';

interface AttachmentUploaderProps {
    attachments: Attachment[];
    onRemove: (id: string) => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAudioSave: (file: File) => void;
}

export function AttachmentUploader({
    attachments,
    onRemove,
    onFileUpload,
    onAudioSave
}: AttachmentUploaderProps) {
    return (
        <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Evidence
            </label>

            {/* Attachment List */}
            {attachments.length > 0 && (
                <div className="space-y-2 mb-3">
                    {attachments.map(att => (
                        <AttachmentItem
                            key={att.id}
                            attachment={att}
                            onRemove={() => onRemove(att.id)}
                        />
                    ))}
                </div>
            )}

            {/* Upload Buttons */}
            <div className="flex gap-2">
                <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 rounded-lg text-slate-700 dark:text-gray-200 text-sm transition">
                    <Camera size={16} />
                    <span>Photo</span>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={onFileUpload}
                    />
                </label>

                <AudioRecorder onSave={onAudioSave} />
            </div>
        </div>
    );
}

// Individual Attachment Item
interface AttachmentItemProps {
    attachment: Attachment;
    onRemove: () => void;
}

function AttachmentItem({ attachment, onRemove }: AttachmentItemProps) {
    return (
        <div className="relative group border border-slate-200 dark:border-gray-700 rounded-lg p-2 bg-slate-50 dark:bg-gray-900/50 flex items-center gap-3">
            {attachment.type === 'image' ? (
                <div className="h-12 w-12 shrink-0 bg-slate-200 dark:bg-gray-700 rounded overflow-hidden">
                    <img src={attachment.url} alt="thumb" className="h-full w-full object-cover" />
                </div>
            ) : attachment.type === 'audio' ? (
                <div className="flex items-center gap-2 w-full">
                    <div className="h-10 w-10 shrink-0 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Mic size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <AudioPlayer src={attachment.url} />
                    </div>
                </div>
            ) : (
                <div className="h-12 w-12 shrink-0 bg-slate-200 dark:bg-gray-700 rounded flex items-center justify-center">
                    <Paperclip size={20} className="text-slate-400 dark:text-gray-400" />
                </div>
            )}

            {/* Delete Button */}
            <button
                type="button"
                onClick={onRemove}
                className="ml-auto p-1.5 text-slate-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition"
                title="Delete attachment"
            >
                <X size={16} />
            </button>
        </div>
    );
}
