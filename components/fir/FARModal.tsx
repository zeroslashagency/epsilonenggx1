import React, { useState, useEffect } from 'react';
import { supabase } from './supabase-adapter';
import { CheckCircle, XCircle, X, Loader2, Camera, Paperclip, Mic, ChevronRight } from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';
import { AudioPlayer } from './AudioPlayer';
import { Priority, Attachment, User } from '@/app/types/fir';

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
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
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
        setMessage(null);
        setCategory(''); // Will be set after categories load
    };

    const fetchEmployees = async () => {
        setLoadingEmployees(true);
        const { data, error } = await supabase
            .from('employee_master')
            .select('id, employee_name, employee_code')
            .order('employee_name');

        if (error) {
            console.error('Error fetching employees:', error);
            setMessage({ type: 'error', text: 'Failed to load employees.' });
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
            // Set default category if available
            if (data && data.length > 0 && type) {
                const firstMatch = data.find((c: CategoryItem) => c.type === type);
                if (firstMatch) {
                    setCategory(firstMatch.name);
                }
            }
        }
    };

    const handleEmployeeSelect = (empId: string) => {
        setSelectedEmployeeId(empId);
        setStep('FILL_FORM');
        // Ensure category is set if not already
        if (!category && categories.length > 0 && type) {
            const firstMatch = categories.find(c => c.type === type);
            if (firstMatch) setCategory(firstMatch.name);
        }
    };

    const uploadFile = async (file: File): Promise<string | null> => {
        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('attachments')
                .getPublicUrl(filePath);

            return data.publicUrl;
        } catch (error) {
            console.error('Error uploading file:', error);
            setMessage({ type: 'error', text: 'Failed to upload file.' });
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const publicUrl = await uploadFile(file);

            if (publicUrl) {
                const newAtt: Attachment = {
                    id: `att_${Date.now()}`,
                    name: file.name,
                    type: file.type.startsWith('image') ? 'image' : 'document',
                    url: publicUrl
                };
                setAttachments([...attachments, newAtt]);
            }
        }
    };

    const handleAudioSave = async (file: File) => {
        const publicUrl = await uploadFile(file);

        if (publicUrl) {
            const newAtt: Attachment = {
                id: `audio_${Date.now()}`,
                name: "Voice Note",
                type: 'audio',
                url: publicUrl
            };
            setAttachments([...attachments, newAtt]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!type || !selectedEmployeeId) return;

        setSubmitting(true);
        setMessage(null);

        const { error } = await supabase
            .from('fir_activity')
            .insert([
                {
                    employee_id: parseInt(selectedEmployeeId),
                    fir_type: type,
                    title: title,
                    category: category,
                    priority: priority,
                    description: description,
                    attachments: attachments,
                    status: 'NEW',
                    created_by: currentUser?.name || 'Unknown User',
                    submitted_person_id: currentUser?.id,
                }
            ]);

        setSubmitting(false);

        if (error) {
            console.error('Error submitting FIR:', error);
            setMessage({ type: 'error', text: 'Failed to submit report. Please try again.' });
        } else {
            setMessage({ type: 'success', text: 'Report submitted successfully!' });
            if (onReportSubmitted) {
                onReportSubmitted();
            }
            setTimeout(() => {
                onClose();
            }, 1500);
        }
    };

    if (!isOpen) return null;

    const filteredCategories = categories.filter(c => c.type === type);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className={`p-4 flex justify-between items-center ${type === 'GOOD' ? 'bg-green-600 dark:bg-green-700' : 'bg-red-600 dark:bg-red-700'} text-white shrink-0`}>
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
                            <h4 className="text-lg font-semibold text-slate-800 dark:text-gray-100 mb-4">Select Employee</h4>
                            {loadingEmployees ? (
                                <div className="flex items-center justify-center py-10 text-slate-400 dark:text-gray-400">
                                    <Loader2 className="animate-spin mr-2" /> Loading employees...
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {employees.map(emp => (
                                        <button
                                            key={emp.id}
                                            onClick={() => handleEmployeeSelect(emp.id.toString())}
                                            className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group text-left"
                                        >
                                            <div>
                                                <div className="font-medium text-slate-900 dark:text-white">{emp.employee_name}</div>
                                                <div className="text-sm text-slate-500 dark:text-gray-400">{emp.employee_code}</div>
                                            </div>
                                            <ChevronRight className="text-slate-300 dark:text-gray-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {message && (
                                <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                    {message.text}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">What happened?</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Short title (e.g., Missed safety step)"
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition placeholder-slate-400 dark:placeholder-gray-400"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Category</label>
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

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1">Description</label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Provide details..."
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder-slate-400 dark:placeholder-gray-400"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>

                            {/* Evidence Section */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Evidence</label>

                                <div className="space-y-2 mb-3">
                                    {attachments.map(att => (
                                        <div key={att.id} className="relative group border border-slate-200 dark:border-gray-700 rounded-lg p-2 bg-slate-50 dark:bg-gray-900/50 flex items-center gap-3">
                                            {att.type === 'image' ? (
                                                <div className="h-12 w-12 shrink-0 bg-slate-200 dark:bg-gray-700 rounded overflow-hidden">
                                                    <img src={att.url} alt="thumb" className="h-full w-full object-cover" />
                                                </div>
                                            ) : att.type === 'audio' ? (
                                                <div className="flex items-center gap-2 w-full">
                                                    <div className="h-10 w-10 shrink-0 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                        <Mic size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <AudioPlayer src={att.url} />
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
                                                onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))}
                                                className="ml-auto p-1.5 text-slate-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition"
                                                title="Delete attachment"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 rounded-lg text-slate-700 dark:text-gray-200 text-sm transition">
                                        <Camera size={16} />
                                        <span>Photo</span>
                                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                                    </label>

                                    <AudioRecorder onSave={handleAudioSave} />
                                </div>
                            </div>
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
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-gray-300 font-medium hover:text-slate-800 dark:hover:text-white">Cancel</button>
                    {step === 'FILL_FORM' && (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className={`px-6 py-2 text-white font-medium rounded-lg shadow-md transform active:scale-95 transition
             ${type === 'GOOD' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
             ${submitting ? 'opacity-70 cursor-not-allowed' : ''}
           `}
                        >
                            {submitting ? 'Saving...' : 'Submit Report'}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
