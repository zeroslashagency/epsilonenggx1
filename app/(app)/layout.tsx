"use client"

import { ReactNode } from 'react'
import { BreadcrumbProvider } from '@/app/lib/contexts/breadcrumb-context'
import { SidebarProvider, SidebarInset } from '@/components/animate-ui/components/radix/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { AppHeader } from '@/components/app-header'
// import { ZohoBreadcrumb } from '@/app/components/zoho-ui/ZohoBreadcrumb'

export default function AppLayout({ children }: { children: ReactNode }) {
    return (
        <BreadcrumbProvider>
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    <AppHeader />
                    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                        <div className="px-4 py-2">
                            {/* Breadcrumb integration point */}
                        </div>
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </BreadcrumbProvider>
    )
}
