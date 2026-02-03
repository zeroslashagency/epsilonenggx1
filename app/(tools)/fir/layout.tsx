"use client"

import React, { Suspense } from 'react';

import { useSearchParams } from 'next/navigation';

function FIRLayoutContent({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    const view = searchParams.get('view');

    let label = 'Dashboard';
    if (view === 'reports') label = 'All Reports';
    if (view === 'categories') label = 'Categories';
    if (view === 'analytics') label = 'Analytics';

    return (
        <div className="space-y-6 p-6">
            {children}
        </div>
    );
}

export default function FIRLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
            <FIRLayoutContent>{children}</FIRLayoutContent>
        </Suspense>
    );
}
