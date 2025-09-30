# Deployment Guide - Epsilon Scheduling System

## Environment Variables Setup

### Required Environment Variables

The application requires the following environment variables to function properly:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Getting Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project: `sxnaopzgaddvziplrlbe`
3. Navigate to **Settings** → **API**
4. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

## Deployment Platforms

### Vercel Deployment

1. **Connect Repository**
   ```bash
   # Repository: https://github.com/zeroslashagency/epsilonengg.git
   ```

2. **Set Environment Variables**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add each environment variable:
     - `NEXT_PUBLIC_SUPABASE_URL` = `https://sxnaopzgaddvziplrlbe.supabase.co`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your_anon_key`
     - `SUPABASE_SERVICE_ROLE_KEY` = `your_service_role_key`

3. **Deploy**
   - Vercel will automatically deploy when you push to the repository
   - Framework: Next.js (auto-detected)

### Netlify Deployment

1. **Connect Repository**
   - Import from GitHub: `zeroslashagency/epsilonengg`

2. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Framework: Next.js

3. **Environment Variables**
   - Go to Site Settings → Environment Variables
   - Add the same three environment variables as above

### Local Development

1. **Clone Repository**
   ```bash
   git clone https://github.com/zeroslashagency/epsilonengg.git
   cd epsilonengg
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Database Setup

The application uses the existing Supabase database with the following key tables:
- `profiles` - User profiles and information
- `roles` - User roles (Admin, Super Admin, Operator)
- `permissions` - System permissions
- `user_roles` - User-role assignments
- `role_permissions` - Role-permission mappings
- `audit_logs` - Activity logging and audit trail
- `employee_attendance_logs` - Attendance data
- `employee_master` - Employee master data

## Features Included

- ✅ **User Management** - Complete RBAC system
- ✅ **Attendance System** - SmartOffice integration
- ✅ **Activity Logging** - Comprehensive audit trails
- ✅ **Permission Management** - Granular access control
- ✅ **Manufacturing Dashboard** - Scheduling interface
- ✅ **Real-time Sync** - Office data synchronization

## Troubleshooting

### Common Issues

1. **Environment Variable Errors**
   - Ensure all three Supabase environment variables are set
   - Check that values don't have extra spaces or quotes

2. **Database Connection Issues**
   - Verify Supabase project is active
   - Check RLS policies are properly configured
   - Ensure service role key has proper permissions

3. **Authentication Issues**
   - Verify anon key is correct
   - Check Supabase Auth settings
   - Ensure user creation is working properly

### Support

For technical support or deployment issues, contact the development team.
