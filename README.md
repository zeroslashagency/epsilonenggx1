# Epsilon Scheduling System

Manufacturing Dashboard & Attendance System built with Next.js and Supabase.

## Environment Setup

1. **Create a `.env.local` file** in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

2. **Vercel Deployment**
   - Go to your Vercel project settings
   - Add the following environment variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY` (keep this private)

## Security Notice

If you've committed sensitive credentials to version control:
1. Rotate your Supabase API keys immediately
2. Update all environments where these keys were used
3. Consider your previous keys compromised
