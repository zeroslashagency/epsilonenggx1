import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { CheckCircle, XCircle, Plus, Trash2, Loader2 } from 'lucide-react';

interface CategoryItem {
    id: number;
    name: string;
    type: 'GOOD' | 'BAD';
}

export function CategoryManager() {
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCategory, setNewCategory] = useState('');
    const [activeTab, setActiveTab] = useState<'GOOD' | 'BAD'>('GOOD');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('report_categories')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching categories:', error);
        } else {
            setCategories(data || []);
        }
        setLoading(false);
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory.trim()) return;

        setAdding(true);
        const { error } = await supabase
            .from('report_categories')
            .insert([{ name: newCategory.trim(), type: activeTab }]);

        if (error) {
            console.error('Error adding category:', error);
            alert('Failed to add category');
        } else {
            setNewCategory('');
            fetchCategories();
        }
        setAdding(false);
    };

    const handleDeleteCategory = async (id: number) => {
        if (!confirm('Are you sure you want to delete this category?')) return;

        const { error } = await supabase
            .from('report_categories')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting category:', error);
            alert('Failed to delete category');
        } else {
            fetchCategories();
        }
    };

    const filteredCategories = categories.filter(c => c.type === activeTab);

    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Category Management</h1>
                <p className="text-slate-500">Manage the list of available categories for reports.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('GOOD')}
                        className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors
              ${activeTab === 'GOOD' ? 'bg-green-50 text-green-700 border-b-2 border-green-500' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <CheckCircle size={18} />
                        Positive Categories
                    </button>
                    <button
                        onClick={() => setActiveTab('BAD')}
                        className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors
              ${activeTab === 'BAD' ? 'bg-red-50 text-red-700 border-b-2 border-red-500' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <XCircle size={18} />
                        Negative Categories
                    </button>
                </div>

                <div className="p-6">
                    {/* Add New Form */}
                    <form onSubmit={handleAddCategory} className="flex gap-3 mb-8">
                        <input
                            type="text"
                            placeholder={`Add new ${activeTab === 'GOOD' ? 'positive' : 'negative'} category...`}
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={adding || !newCategory.trim()}
                            className={`px-6 py-2 text-white font-medium rounded-lg shadow-sm transition-all flex items-center gap-2
                ${activeTab === 'GOOD' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                ${(adding || !newCategory.trim()) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
                        >
                            {adding ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                            Add
                        </button>
                    </form>

                    {/* List */}
                    {loading ? (
                        <div className="text-center py-10 text-slate-400">
                            <Loader2 className="animate-spin mx-auto mb-2" />
                            Loading categories...
                        </div>
                    ) : filteredCategories.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                            No categories found. Add one above!
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredCategories.map(cat => (
                                <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg group hover:border-indigo-300 transition-colors">
                                    <span className="font-medium text-slate-700">{cat.name}</span>
                                    <button
                                        onClick={() => handleDeleteCategory(cat.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete category"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
