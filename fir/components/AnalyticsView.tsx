import React, { useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { Report, ReportStatus } from '../types';
import { CheckCircle, XCircle, TrendingUp, Activity } from 'lucide-react';

interface AnalyticsViewProps {
    reports: Report[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const STATUS_COLORS = {
    [ReportStatus.New]: '#3B82F6', // Blue
    [ReportStatus.UnderReview]: '#F59E0B', // Amber
    [ReportStatus.Escalated]: '#EF4444', // Red
    [ReportStatus.Accepted]: '#10B981', // Green
    [ReportStatus.Closed]: '#6B7280', // Gray
    [ReportStatus.Rejected]: '#EF4444', // Red
    [ReportStatus.Reported]: '#3B82F6',
    [ReportStatus.PersonResponse]: '#F59E0B',
    [ReportStatus.SuperAdminReview]: '#8B5CF6',
    [ReportStatus.Refused]: '#9CA3AF', // Gray for refused
};

export function AnalyticsView({ reports }: AnalyticsViewProps) {

    // 1. Calculate Summary Stats
    const stats = useMemo(() => {
        const total = reports.length;
        const positive = reports.filter(r => r.fir_type === 'GOOD').length;
        const negative = reports.filter(r => r.fir_type === 'BAD').length;
        const positiveRate = total > 0 ? Math.round((positive / total) * 100) : 0;

        return { total, positive, negative, positiveRate };
    }, [reports]);

    // 2. Prepare Data for Trends (Last 7 Days)
    const trendData = useMemo(() => {
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        return last7Days.map(date => {
            const dayReports = reports.filter(r => r.reportedAt.startsWith(date));
            return {
                date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                positive: dayReports.filter(r => r.fir_type === 'GOOD').length,
                negative: dayReports.filter(r => r.fir_type === 'BAD').length,
                total: dayReports.length
            };
        });
    }, [reports]);

    // 3. Prepare Data for Categories
    const categoryData = useMemo(() => {
        const counts: Record<string, { name: string, positive: number, negative: number }> = {};

        reports.forEach(r => {
            if (!counts[r.category]) {
                counts[r.category] = { name: r.category, positive: 0, negative: 0 };
            }
            if (r.fir_type === 'GOOD') counts[r.category].positive++;
            else counts[r.category].negative++;
        });

        return Object.values(counts).sort((a, b) => (b.positive + b.negative) - (a.positive + a.negative)).slice(0, 5);
    }, [reports]);

    // 4. Prepare Data for Status
    const statusData = useMemo(() => {
        const counts: Record<string, number> = {};
        reports.forEach(r => {
            counts[r.status] = (counts[r.status] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [reports]);

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-10">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Analytics Dashboard</h1>
                    <p className="text-slate-500">Insights into performance, trends, and report distribution.</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-500 font-medium text-sm">Total Reports</span>
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Activity size={20} /></div>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-500 font-medium text-sm">Positive Rate</span>
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={20} /></div>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{stats.positiveRate}%</div>
                        <div className="text-xs text-slate-400 mt-1">of total reports</div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-500 font-medium text-sm">Positive Reports</span>
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><CheckCircle size={20} /></div>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{stats.positive}</div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-slate-500 font-medium text-sm">Negative Reports</span>
                            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><XCircle size={20} /></div>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{stats.negative}</div>
                    </div>
                </div>

                {/* Charts Row 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Activity Trend */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Activity Trends (Last 7 Days)</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData}>
                                    <defs>
                                        <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area type="monotone" dataKey="positive" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorPos)" name="Positive" />
                                    <Area type="monotone" dataKey="negative" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorNeg)" name="Negative" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Status Distribution */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Report Status Distribution</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={80}
                                        outerRadius={110}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as ReportStatus] || COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Charts Row 2 */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Top Categories by Type</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend />
                                <Bar dataKey="positive" name="Positive" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                <Bar dataKey="negative" name="Negative" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}
