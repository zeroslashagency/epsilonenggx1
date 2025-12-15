import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Report, ReportStatus } from '../types';

interface StatsWidgetProps {
  reports: Report[];
}

export const StatsWidget: React.FC<StatsWidgetProps> = ({ reports }) => {
  const data = [
    { name: 'New', value: reports.filter(r => r.status === ReportStatus.New).length, color: '#3b82f6' },
    { name: 'Review', value: reports.filter(r => r.status === ReportStatus.UnderReview).length, color: '#eab308' },
    { name: 'Escalated', value: reports.filter(r => r.status === ReportStatus.Escalated).length, color: '#ef4444' },
    { name: 'Closed', value: reports.filter(r => r.status === ReportStatus.Closed).length, color: '#22c55e' },
  ].filter(d => d.value > 0);

  return (
    <div className="h-48 w-full bg-white rounded-xl border border-slate-200 p-4 mb-4 flex items-center justify-between">
       <div className="flex-1">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Overview</h4>
          <div className="text-3xl font-bold text-slate-800">{reports.length}</div>
          <div className="text-xs text-slate-400">Total Reports</div>
       </div>
       <div className="h-full w-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={25}
              outerRadius={40}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ background: '#fff', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', borderRadius: '8px', fontSize: '12px' }}
              itemStyle={{ color: '#334155' }}
            />
          </PieChart>
        </ResponsiveContainer>
       </div>
    </div>
  );
};