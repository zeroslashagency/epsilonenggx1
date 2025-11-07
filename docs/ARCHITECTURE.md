# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js Frontend                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │Dashboard │  │Attendance│  │ Schedule │  │Settings │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Users   │  │Attendance│  │ Schedule │  │  Sync   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase Backend                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │PostgreSQL│  │   Auth   │  │ Storage  │  │  Edge   │ │
│  │          │  │          │  │          │  │Functions│ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              SmartOffice Biometric System                │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
epsilonschedulingmain/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── admin/           # Admin APIs
│   │   ├── attendance/      # Attendance APIs
│   │   └── sync/            # Sync APIs
│   ├── dashboard/           # Dashboard page
│   ├── attendance/          # Attendance page
│   ├── schedule/            # Schedule pages
│   ├── settings/            # Settings pages
│   └── lib/                 # Shared utilities
│       ├── services/        # API services
│       ├── middleware/      # Auth middleware
│       └── validation/      # Input validation
├── components/              # React components
│   ├── ui/                  # Shadcn UI components
│   └── __tests__/          # Component tests
├── supabase/
│   ├── functions/          # Edge Functions
│   └── migrations/         # Database migrations
├── docs/                   # Documentation
├── .github/
│   └── workflows/          # CI/CD pipelines
└── tests/                  # Test files
```

## Key Technologies

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **Recharts** - Data visualization

### Backend
- **Supabase** - PostgreSQL database
- **Supabase Auth** - Authentication
- **Edge Functions** - Serverless functions
- **Row Level Security** - Database security

### Testing
- **Jest** - Test runner
- **React Testing Library** - Component testing
- **Zod** - Runtime validation

### CI/CD
- **GitHub Actions** - Automated testing & deployment
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Data Flow

### Authentication Flow
```
User Login → Supabase Auth → JWT Token → Protected Routes
```

### Attendance Sync Flow
```
SmartOffice → Edge Function → PostgreSQL → Frontend
```

### Permission Check Flow
```
User Action → Middleware → Check Permissions → Allow/Deny
```

## Security Architecture

### Layers of Security
1. **Frontend** - Route protection, UI-level checks
2. **API Middleware** - Backend permission verification
3. **Database** - Row Level Security (RLS)
4. **Input Validation** - Zod schemas

### RBAC System
- **Roles:** Super Admin, Admin, Operator, Monitor, Attendance
- **Permissions:** Granular per-feature permissions
- **Enforcement:** Backend + Database level

## Performance Optimizations

### Applied
- ✅ React.memo for expensive components
- ✅ useCallback for function memoization
- ✅ useMemo for computed values
- ✅ Code splitting with dynamic imports

### Recommended
- Enable Next.js image optimization
- Add React Query for caching
- Implement service workers
- Add CDN for static assets

## Scalability Considerations

### Current Capacity
- Handles 100+ concurrent users
- Real-time attendance sync
- Sub-second dashboard load times

### Future Scaling
- Add Redis for caching
- Implement database read replicas
- Add load balancing
- Optimize database queries with indexes
