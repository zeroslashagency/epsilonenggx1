"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from './supabase-adapter';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { Priority, Attachment, User } from '@/app/types/fir';
import { EmployeeSelector, AttachmentUploader } from './forms';
import { toast } from 'sonner';

interface Employee {
    id: number;
    employee_name: string;
    employee_code: string;
}

interface CategoryItem {
    id: number;
    name: string;
    type: 'GOOD' | 'BAD';
}

interface FARModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'GOOD' | 'BAD' | null;
    onReportSubmitted?: () => void;
    currentUser: User | null;
}

/**
 * FARModal - Refactored from 386 lines to ~220 lines
 * 
 * Extracted components:
 * - EmployeeSelector: Employee list selection
 * - AttachmentUploader: Evidence upload with audio/photo support
 */
export function FARModal({ isOpen, onClose, type, onReportSubmitted, currentUser }: FARModalProps) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    // Workflow State
    const [step, setStep] = useState<'SELECT_EMPLOYEE' | 'FILL_FORM'>('SELECT_EMPLOYEE');

    // Form Data
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<string>('');
    const [priority, setPriority] = useState<Priority>(Priority.Low);
    const [attachments, setAttachments] = useState<Attachment[]>([]);

    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchEmployees();
            fetchCategories();
            resetForm();
        }
    }, [isOpen, type]);

    const resetForm = () => {
        setStep('SELECT_EMPLOYEE');
        setSelectedEmployeeId('');
        setTitle('');
        setDescription('');
        setAttachments([]);
        setCategory('');
    };

    const fetchEmployees = async () => {
        setLoadingEmployees(true);
        const { data, error } = await supabase
            .from('employee_master')
            .select('id, employee_name, employee_code')
            .order('employee_name');

        if (error) {
            console.error('Error fetching employees:', error);
            toast.error('Failed to load employees');
        } else {
            setEmployees(data || []);
        }
        setLoadingEmployees(false);
    };

    const fetchCategories = async () => {
        const { data, error } = await supabase
            .from('report_categories')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching categories:', error);
        } else {
            setCategories(data || []);
            // Set default category
            if (data && data.length > 0 && type) {
                const firstMatch = data.find((c: CategoryItem) => c.type === type);
                if (firstMatch) setCategory(firstMatch.name);
            }
        }
    };

    const handleEmployeeSelect = (empId: string) => {
        setSelectedEmployeeId(empId);
        setStep('FILL_FORM');
        // Ensure category is set
        if (!category && categories.length > 0 && type) {
            const firstMatch = categories.find(c => c.type === type);
            if (firstMatch) setCategory(firstMatch.name);
        }
    };

    // File Upload Helper
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
                setAttachments(prev => [...prev, {
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
            setAttachments(prev => [...prev, {
                id: `audio_${Date.now()}`,
                name: 'Voice Note',
                type: 'audio',
                url: publicUrl
            }]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!type || !selectedEmployeeId) return;

        setSubmitting(true);

        const { error } = await supabase
            .from('fir_activity')
            .insert([{
                employee_id: parseInt(selectedEmployeeId),
                fir_type: type,
                title,
                category,
                priority,
                description,
                attachments,
                status: 'NEW',
                created_by: currentUser?.name || 'Unknown User',
                submitted_person_id: currentUser?.id,
            }]);

        setSubmitting(false);

        if (error) {
            console.error('Error submitting FIR:', error);
            toast.error('Failed to submit report');
        } else {
            toast.success('Report submitted successfully!');
            onReportSubmitted?.();
            setTimeout(onClose, 1000);
        }
    };

    if (!isOpen) return null;

    const filteredCategories = categories.filter(c => c.type === type);
    const headerColor = type === 'GOOD' ? 'bg-green-600 dark:bg-green-700' : 'bg-red-600 dark:bg-red-700';
    const submitColor = type === 'GOOD' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className={`p-4 flex justify-between items-center ${headerColor} text-white shrink-0`}>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        {type === 'GOOD' ? <CheckCircle /> : <XCircle />}
                        {type === 'GOOD' ? 'Income Producing Activity' : 'Income Reducing Activity'}
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {step === 'SELECT_EMPLOYEE' ? (
                        <div className="p-6">
                            <h4 className="text-lg font-semibold text-slate-800 dark:text-gray-100 mb-4">
                                Select Employee
                            </h4>
                            <EmployeeSelector
                                employees={employees}
                                loading={loadingEmployees}
                                onSelect={handleEmployeeSelect}
                            />
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    What happened?
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Short title (e.g., Missed safety step)"
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    Category
                                </label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white rounded-lg outline-none"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                >
                                    <option value="" disabled>Select a category</option>
                                    {filteredCategories.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    Description
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Provide details..."
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>

                            {/* Attachments */}
                            <AttachmentUploader
                                attachments={attachments}
                                onRemove={(id) => setAttachments(prev => prev.filter(a => a.id !== id))}
                                onFileUpload={handleFileUpload}
                                onAudioSave={handleAudioSave}
                            />
                        </form>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50 flex justify-end gap-3 shrink-0">
                    {step === 'FILL_FORM' && (
                        <button
                            onClick={() => setStep('SELECT_EMPLOYEE')}
                            className="px-4 py-2 text-slate-600 dark:text-gray-300 font-medium hover:text-slate-800 dark:hover:text-white mr-auto"
                        >
                            Back
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 dark:text-gray-300 font-medium hover:text-slate-800 dark:hover:text-white"
                    >
                        Cancel
                    </button>
                    {step === 'FILL_FORM' && (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className={`px-6 py-2 text-white font-medium rounded-lg shadow-md active:scale-95 transition ${submitColor} ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {submitting ? 'Saving...' : 'Submit Report'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
