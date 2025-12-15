/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false, // ✅ SECURITY: Enable ESLint checks
  },
  typescript: {
    ignoreBuildErrors: false, // ✅ SECURITY: Enable TypeScript checks
  },
  images: {
    unoptimized: true,
  },

  // Disable all caching for real-time attendance data


  // Force no-cache headers globally + Security headers
  async headers() {
    return [
      {
        // All API routes - no caching + security
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
          // 🔐 SECURITY HEADERS
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        // All pages - security headers
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live https://va.vercel-scripts.com;"
          },
        ],
      },
      {
        // Attendance page - no caching
        source: '/attendance',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate, max-age=0' },
        ],
      },
    ]
  },
}

export default nextConfig
