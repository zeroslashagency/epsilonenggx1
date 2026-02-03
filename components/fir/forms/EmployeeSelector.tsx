import React from 'react';
import { Loader2, ChevronRight } from 'lucide-react';

interface Employee {
    id: number;
    employee_name: string;
    employee_code: string;
}

interface EmployeeSelectorProps {
    employees: Employee[];
    loading: boolean;
    onSelect: (employeeId: string) => void;
}

export function EmployeeSelector({ employees, loading, onSelect }: EmployeeSelectorProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-10 text-slate-400 dark:text-gray-400">
                <Loader2 className="animate-spin mr-2" /> Loading employees...
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {employees.map(emp => (
                <button
                    key={emp.id}
                    onClick={() => onSelect(emp.id.toString())}
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
    );
}
