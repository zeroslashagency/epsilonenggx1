# Epsilon Scheduling System

Enterprise-grade production scheduling and attendance tracking system built with Next.js 14, TypeScript, and Supabase.

## 🚀 Overview

Epsilon is a comprehensive manufacturing management system that handles:
- **User Management** - Role-based access control (RBAC) with custom permissions
- **Attendance Tracking** - Real-time sync with SmartOffice biometric devices
- **Production Scheduling** - Machine allocation and job scheduling
- **Analytics & Reporting** - Real-time dashboards and performance metrics
- **System Monitoring** - Health checks, alerts, and audit logs

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **UI Components:** Radix UI, Tailwind CSS 4, Shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Authentication:** Supabase Auth with custom RBAC
- **State Management:** React Context + Hooks
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **Deployment:** Vercel

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Git

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd epsilonschedulingmain
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Run database migrations**
   ```bash
   # Using Supabase CLI
   npx supabase db push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
epsilonschedulingmain/
├── app/                    # Next.js 14 App Router
│   ├── (main)/            # Main application pages
│   ├── api/               # API routes
│   ├── attendance/        # Attendance module
│   ├── users/             # User management
│   ├── settings/          # System settings
│   └── lib/               # Utilities and contexts
├── components/            # Reusable UI components
│   └── ui/               # Shadcn/ui components
├── supabase/             # Database migrations
│   └── migrations/       # SQL migration files
├── scripts/              # Utility scripts
│   ├── database/         # Database utilities
│   ├── deployment/       # Deployment scripts
│   ├── maintenance/      # Monitoring & cleanup
│   └── development/      # Dev utilities
├── docs/                 # Documentation
│   ├── audits/          # Audit reports
│   ├── fixes/           # Fix documentation
│   └── archive/         # Old reports
├── public/              # Static assets
├── set-upx3/           # Production sync system (LIVE)
└── .cascade/           # IDE rules and guidelines
```

## 🔐 Authentication & Permissions

The system uses a sophisticated RBAC (Role-Based Access Control) system:

### Default Roles
- **Super Admin** - Full system access
- **Admin** - User management, settings
- **Operator** - Production operations
- **Monitor** - View-only access
- **Attendance** - Attendance tracking only

### Permission System
- Granular permissions per feature
- Custom permissions per user
- Super Admin bypass for all checks
- Row Level Security (RLS) policies

## 🎯 Key Features

### 1. User Management
- Create/edit/deactivate users
- Assign roles and custom permissions
- Activity logging and audit trail
- Employee import from attendance system

### 2. Attendance System (LIVE)
⚠️ **CRITICAL:** Production sync running on office computer
- Real-time sync with SmartOffice (every 5 seconds)
- 13,000+ attendance records
- Employee master data management
- Analytics and reports

### 3. Production Scheduling
- Machine allocation
- Job scheduling
- Production orders
- Schedule optimization

### 4. Analytics & Monitoring
- Real-time dashboards
- Performance metrics
- System health monitoring
- Alert management

## 🚨 Important Notes

### Production Sync System
**DO NOT MODIFY** without approval:
- `/set-upx3/` folder (deployed on office computer)
- `/app/api/sync-attendance/` endpoints
- `/app/api/attendance-analytics/` endpoints
- Database tables: `attendance_logs`, `employee_master`

Breaking this system stops ALL attendance data collection!

### Security
- Never commit `.env` files
- Never hardcode credentials
- Use environment variables only
- Rotate keys if exposed

## 📚 Documentation

- **Setup Guide:** `docs/SETUP.md` (coming soon)
- **API Documentation:** `docs/API.md` (coming soon)
- **Deployment Guide:** `docs/DEPLOYMENT.md` (coming soon)
- **Development Rules:** `.cascade/rules.md`
- **Audit Reports:** `docs/audits/`

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

```bash
# Or use Vercel CLI
npx vercel
```

### Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## 📊 Database

### Migrations
Located in `supabase/migrations/`

Run migrations:
```bash
npx supabase db push
```

### Key Tables
- `profiles` - User profiles
- `roles` - System roles
- `permissions` - Available permissions
- `user_roles` - User-role mapping
- `user_permissions` - Custom permissions
- `attendance_logs` - Attendance records
- `employee_master` - Employee data
- `audit_logs` - System audit trail

## 🛠️ Development

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Functional components with hooks
- Follow `.cascade/rules.md`

### Git Workflow
1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request
5. Code review
6. Merge to main

## 🐛 Troubleshooting

### Common Issues

**Build fails:**
```bash
rm -rf .next node_modules
npm install
npm run build
```

**Database connection issues:**
- Check Supabase credentials
- Verify RLS policies
- Check network connectivity

**Attendance sync not working:**
- Check office computer status
- Verify SmartOffice API (localhost:84)
- Check Supabase logs

## 📞 Support

For issues or questions:
1. Check `docs/` folder
2. Review `.cascade/rules.md`
3. Check audit reports in `docs/audits/`
4. Contact system administrator

## 📝 License

Proprietary - All rights reserved

## 🎯 Roadmap

- [ ] Automated testing suite
- [ ] API documentation
- [ ] Performance optimization
- [ ] Mobile app
- [ ] Advanced analytics
- [ ] Machine learning predictions

---

**Version:** 1.0.0  
**Last Updated:** October 26, 2025  
**Status:** Production (Stable)
