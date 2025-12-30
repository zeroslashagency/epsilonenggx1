import type React from "react"
import { Suspense } from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"
import { ThemeProvider } from "./lib/contexts/theme-context"
import { ToastProvider } from "./lib/contexts/toast-context"
import { AuthProvider } from "./lib/contexts/auth-context"
import { QueryProvider } from "./lib/providers/query-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Epsilon Scheduling - Premium Manufacturing Dashboard",
  description: "Advanced scheduling and operations management for manufacturing",
  generator: "v0.app",
  icons: {
    icon: '/Epsilologo.svg',
    shortcut: '/Epsilologo.svg',
    apple: '/Epsilologo.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              {/* ⚡ PERFORMANCE: React Query for caching and deduplication */}
              <QueryProvider>
                <Suspense fallback={null}>{children}</Suspense>
              </QueryProvider>
              <Toaster />
              <Analytics />
              {/* ⚡ PERFORMANCE: Speed Insights for Web Vitals monitoring */}
              <SpeedInsights />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

