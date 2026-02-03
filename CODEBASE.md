# Epsilon Scheduling System - Codebase Documentation

> Auto-generated codebase reference for AI assistants and developers

---

## Project Overview

| Attribute | Value |
|-----------|-------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Database** | Supabase (PostgreSQL) |
| **UI Library** | Radix UI + Shadcn/ui |
| **Styling** | Tailwind CSS 4 |
| **Deployment** | Vercel |

---

## Directory Structure

```
epsilonschedulingmain/
├── app/                    # Next.js App Router
│   ├── (app)/              # Main authenticated pages
│   │   ├── analytics/      # Analytics dashboard
│   │   ├── attendance/     # Attendance tracking (MAIN)
│   │   ├── chart/          # Machine analyzer
│   │   ├── dashboard/      # Main dashboard
│   │   ├── monitoring/     # System monitoring
│   │   ├── production/     # Production management
│   │   └── settings/       # User/role management
│   ├── api/                # 91 API endpoints
│   │   ├── admin/          # Admin operations
│   │   ├── analytics/      # Analytics APIs
│   │   ├── auth/           # Authentication
│   │   └── ...             # Other endpoints
│   ├── lib/                # Shared utilities
│   └── types/              # TypeScript types
├── components/             # Reusable UI components
│   ├── ui/                 # Shadcn components (51)
│   └── ...                 # App-specific components
├── .agent/                 # AI agent configuration
│   ├── agents/             # 16 specialist agents
│   ├── skills/             # 45 skill modules
│   ├── workflows/          # 11 slash commands
│   └── rules/              # Global rules
└── supabase/               # Database migrations
```

---

## Core Dependencies

### Authentication Flow

```
Auth Context → Supabase Auth → Profile Fetch → Permission Check
     ↓              ↓              ↓              ↓
auth-context.tsx  supabase-*.ts  profiles table  hasPermission()
```

**Key Files:**
- `app/lib/contexts/auth-context.tsx` - Auth state provider
- `app/lib/features/auth/auth.middleware.ts` - Permission checks
- `app/lib/services/supabase-*.ts` - Supabase clients

### Permission System

| Function | Location | Purpose |
|----------|----------|---------|
| `requireAuth` | `auth.middleware.ts` | Basic auth check |
| `requireRole` | `auth.middleware.ts` | Role-based access |
| `hasPermission` | `auth.middleware.ts` | Granular permissions |
| `AttendancePermissions` | `permission-checker.ts` | Feature-specific |

---

## Critical Systems

### 🔴 DO NOT MODIFY

| System | Location | Status |
|--------|----------|--------|
| Attendance Sync | `/set-upx3/` | LIVE PRODUCTION |
| Sync API | `/api/sync-attendance/` | PRODUCTION |
| Raw Logs Table | `employee_raw_logs` | READ ONLY |
| Employee Master | `employee_master` | READ ONLY |

---

## Feature Modules

### `/app/lib/features/`

| Module | Purpose | Key Files |
|--------|---------|-----------|
| `admin/` | Admin operations | `useAdmin.ts` |
| `auth/` | Authentication | `auth.middleware.ts`, `schemas.ts` |
| `fir/` | FIR service | `fir.service.ts` |
| `scheduling/` | Scheduling engine | Multiple files |

### `/app/lib/utils/`

| Utility | Purpose |
|---------|---------|
| `api-client.ts` | Fetch wrapper |
| `date-utils.ts` | Date calculations |
| `permission-checker.ts` | Permission helpers |
| `excel-export.ts` | Excel generation |

---

## API Routes Structure

### Admin APIs (`/api/admin/`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/users` | GET/POST | User management |
| `/roles` | GET/POST | Role management |
| `/roles/[id]` | GET/PUT/DELETE | Role CRUD |
| `/all-activity-logs` | GET | Audit logs |

### Attendance APIs

| Endpoint | Purpose |
|----------|---------|
| `/api/get-attendance` | Main attendance data |
| `/api/attendance-analytics` | Analytics |
| `/api/sync-attendance` | ⚠️ PRODUCTION |

---

## Component Dependencies

### Page → Component Map

| Page | Key Components |
|------|----------------|
| `attendance/page.tsx` | `AttendanceTodayChart`, `PunchStream`, `StatsCard` |
| `dashboard/page.tsx` | `SectionCards`, `ChartAreaInteractive` |
| `settings/users/` | `DataTable`, various forms |

### Shared UI Components

Located in `/components/ui/` (51 Shadcn components):
- Button, Card, Dialog, Table, Select, etc.

---

## Database Tables

### Core Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | User profiles | Yes |
| `roles` | Role definitions | Yes |
| `role_permissions` | Role-permission mapping | Yes |
| `audit_logs` | Activity logging | Yes |
| `employee_raw_logs` | Attendance data | Yes |
| `employee_master` | Employee master data | Yes |

---

## Performance Notes

### Known Optimizations Applied

1. ✅ Console.logs removed from API routes
2. ✅ Excel export extracted to separate utility
3. ⏳ Auth caching (pending)
4. ⏳ Large file splitting (pending)

### Bundle Size Targets

| Page | Current | Target |
|------|---------|--------|
| Dashboard | ~135 kB | <100 kB |
| Attendance | ~161 kB | <130 kB |
| Analytics | ~161 kB | <130 kB |

---

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test:ci      # Run tests with coverage
npm run lint:fix     # Fix lint issues
npm run validate     # Full validation
```

---

## Agent Commands

```bash
/status     # Project status
/test       # Run tests
/debug      # Debug issues
/plan       # Plan features
/create     # Create features
/deploy     # Deploy app
```

---

*Last Updated: 2026-01-22*
