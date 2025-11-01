import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { AuthProvider } from "./lib/contexts/auth-context"
import { ThemeProvider } from "./lib/contexts/theme-context"
import { ToastProvider } from "./lib/contexts/toast-context"
import "./globals.css"

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
              <Suspense fallback={null}>{children}</Suspense>
              <Analytics />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
