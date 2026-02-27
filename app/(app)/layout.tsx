"use client"

import { usePathname } from 'next/navigation'
import { ReactNode, CSSProperties } from 'react'
import { BreadcrumbProvider } from '@/app/lib/contexts/breadcrumb-context'
import { SidebarProvider, SidebarInset } from '@/components/animate-ui/components/radix/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
// import { ZohoBreadcrumb } from '@/app/components/zoho-ui/ZohoBreadcrumb'

export default function AppLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const isScheduler = pathname === '/scheduler'

    return (
        <BreadcrumbProvider>
            <SidebarProvider
                defaultOpen={false}
                style={{ '--sidebar-width-icon': '4rem' } as CSSProperties}
                className="overflow-x-hidden"
            >
                <AppSidebar />
                <SidebarInset className="overflow-x-hidden">
                    {!isScheduler && <AppHeader />}
                    <div className={isScheduler ? "flex flex-1 flex-col overflow-x-hidden" : "flex flex-1 flex-col gap-4 p-4 pt-0 overflow-x-hidden"}>
                        {!isScheduler && (
                            <div className="px-4 py-2">
                                {/* Breadcrumb integration point */}
                            </div>
                        )}
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </BreadcrumbProvider>
    )
}
