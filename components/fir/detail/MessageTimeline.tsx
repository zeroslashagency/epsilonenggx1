"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Message, User, Attachment } from '@/app/types/fir';
import { reportService } from '@/app/lib/features/fir/fir.service';
import { supabase } from '../supabase-adapter';
import {
    CheckCircle2,
    XCircle,
    RotateCcw,
    ShieldCheck,
    MessageCircle,
    Send,
    Camera,
    Paperclip,
    Loader2
} from 'lucide-react';
import { AudioRecorder } from '../AudioRecorder';
import { AudioPlayer } from '../AudioPlayer';
import { toast } from 'sonner';

interface MessageTimelineProps {
    reportId: string;
    currentUser: User;
}

export function MessageTimeline({ reportId, currentUser }: MessageTimelineProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Load messages on mount
    useEffect(() => {
        loadMessages();

        // Subscribe to real-time updates
        const channel = supabase
            .channel(`fir-messages-${reportId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'fir_messages',
                    filter: `report_id=eq.${reportId}`
                },
                (payload) => {
                    setMessages(prev => [...prev, payload.new as Message]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [reportId]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const loadMessages = async () => {
        setLoading(true);
        const data = await reportService.getMessages(reportId);
        setMessages(data);
        setLoading(false);
    };

    const handleSend = async () => {
        if (!newMessage.trim() && attachments.length === 0) return;

        setSending(true);
        const result = await reportService.addMessage(
            reportId,
            newMessage,
            currentUser,
            'comment',
            null,
            attachments
        );

        if (result) {
            setNewMessage('');
            setAttachments([]);
        } else {
            toast.error('Failed to send message');
        }
        setSending(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(fileName, file);

            if (uploadError) {
                toast.error('Failed to upload file');
                return;
            }

            const { data } = supabase.storage.from('attachments').getPublicUrl(fileName);
            setAttachments(prev => [...prev, {
                id: `att_${Date.now()}`,
                name: file.name,
                type: file.type.startsWith('image') ? 'image' : 'document',
                url: data.publicUrl
            }]);
        }
    };

    const handleAudioSave = async (file: File) => {
        const fileName = `audio_${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(fileName, file);

        if (uploadError) {
            toast.error('Failed to upload audio');
            return;
        }

        const { data } = supabase.storage.from('attachments').getPublicUrl(fileName);
        setAttachments(prev => [...prev, {
            id: `audio_${Date.now()}`,
            name: 'Voice Note',
            type: 'audio',
            url: data.publicUrl
        }]);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 text-slate-400 dark:text-gray-500">
                <Loader2 className="animate-spin mr-2" size={20} />
                Loading conversation...
            </div>
        );
    }

    return (
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700 flex flex-col h-[400px]">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-gray-700 flex items-center gap-2">
                <MessageCircle size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                    Conversation
                </h3>
                <span className="text-xs text-slate-400 dark:text-gray-500 ml-auto">
                    {messages.length} messages
                </span>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
            >
                {messages.length === 0 ? (
                    <div className="text-center text-slate-400 dark:text-gray-500 py-8">
                        <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <MessageBubble key={msg.id} message={msg} isOwn={msg.user_id === currentUser.id} />
                    ))
                )}
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/50">
                {/* Attachment Preview */}
                {attachments.length > 0 && (
                    <div className="flex gap-2 mb-2 overflow-x-auto py-1">
                        {attachments.map(att => (
                            <div key={att.id} className="relative flex-shrink-0 w-16 h-16 bg-slate-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                                {att.type === 'image' ? (
                                    <img src={att.url} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <Paperclip size={20} />
                                    </div>
                                )}
                                <button
                                    onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5 text-xs"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white dark:placeholder-gray-400"
                    />

                    <label className="cursor-pointer p-2 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg text-slate-500 dark:text-gray-400 transition">
                        <Camera size={18} />
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>

                    <AudioRecorder onSave={handleAudioSave} />

                    <button
                        onClick={handleSend}
                        disabled={sending || (!newMessage.trim() && attachments.length === 0)}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
            </div>
        </section>
    );
}

// Individual Message Bubble
function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
    const isAction = message.message_type === 'action';
    const isSystem = message.message_type === 'system';

    // Action icon mapping
    const actionIcons: Record<string, React.ReactNode> = {
        accept: <CheckCircle2 size={14} className="text-green-600" />,
        reject: <XCircle size={14} className="text-red-600" />,
        confirm: <ShieldCheck size={14} className="text-green-600" />,
        send_back: <RotateCcw size={14} className="text-orange-600" />,
    };

    if (isSystem) {
        return (
            <div className="text-center">
                <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400 text-xs rounded-full">
                    {message.message}
                </span>
            </div>
        );
    }

    return (
        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${isOwn ? 'order-2' : ''}`}>
                {/* Sender info */}
                <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'justify-end' : ''}`}>
                    <span className="text-xs font-medium text-slate-700 dark:text-gray-300">
                        {message.user_name}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-gray-500">
                        {message.user_role}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-gray-500">
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                {/* Message bubble */}
                <div className={`
          px-4 py-2 rounded-2xl text-sm
          ${isOwn
                        ? 'bg-indigo-600 text-white rounded-br-md'
                        : 'bg-slate-100 dark:bg-gray-700 text-slate-800 dark:text-white rounded-bl-md'
                    }
          ${isAction ? 'border-2 border-indigo-200 dark:border-indigo-800' : ''}
        `}>
                    {isAction && message.action && (
                        <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold uppercase opacity-80">
                            {actionIcons[message.action]}
                            {message.action.replace('_', ' ')}
                        </div>
                    )}
                    <p className="whitespace-pre-wrap">{message.message}</p>

                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                            {message.attachments.map(att => (
                                <div key={att.id}>
                                    {att.type === 'image' ? (
                                        <img src={att.url} alt={att.name} className="rounded-lg max-w-full" />
                                    ) : att.type === 'audio' ? (
                                        <AudioPlayer src={att.url} />
                                    ) : (
                                        <a href={att.url} className="text-xs underline">{att.name}</a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
