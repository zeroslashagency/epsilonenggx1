# Product Requirements Document (PRD)

## Epsilon Scheduling System

---

## Document Information

| Field              | Value                     |
| ------------------ | ------------------------- |
| **Product Name**   | Epsilon Scheduling System |
| **Version**        | 1.0.0                     |
| **Status**         | Production (Stable)       |
| **Last Updated**   | January 22, 2026          |
| **Document Owner** | System Administrator      |

---

## 1. Executive Summary

The Epsilon Scheduling System is an enterprise-grade manufacturing management platform designed for production scheduling, attendance tracking, and workforce management. Built with Next.js 14 and Supabase, it provides real-time synchronization with biometric attendance devices, comprehensive role-based access control, and powerful analytics capabilities.

### Key Achievements

- ✅ Live attendance sync system operational (13,000+ records)
- ✅ Multi-module production scheduling platform
- ✅ Role-based access control with granular permissions
- ✅ Real-time dashboards and analytics
- ✅ Production deployment on Vercel

---

## 2. Business Objectives

### 2.1 Primary Goals

1. **Automate Attendance Tracking** - Real-time sync with SmartOffice biometric devices
2. **Streamline Production Scheduling** - Optimize machine allocation and job scheduling
3. **Centralize Workforce Management** - Unified platform for personnel, roles, and permissions
4. **Enhance Decision Making** - Real-time analytics and reporting

### 2.2 Success Metrics

- **Attendance Sync Accuracy**: 99.9% (currently operational)
- **System Uptime**: 99.5% target
- **User Adoption**: 100+ concurrent users
- **Dashboard Load Time**: < 2 seconds
- **Data Freshness**: Real-time (< 5 seconds for attendance)

---

## 3. Target Users

### 3.1 User Personas

| Role            | Description                | Primary Use Cases                                     |
| --------------- | -------------------------- | ----------------------------------------------------- |
| **Super Admin** | Full system access         | User management, system settings, all operations      |
| **Admin**       | User & settings management | Create users, assign roles, configure system          |
| **Operator**    | Production operations      | Manage schedules, allocate machines, track production |
| **Monitor**     | View-only access           | View dashboards, analytics, reports                   |
| **Attendance**  | Attendance tracking        | Monitor attendance, manage employee data              |

### 3.2 User Permissions

Each role has granular permissions:

- `manage_users` - Create/edit/deactivate users
- `manage_roles` - Create/edit roles and permissions
- `view_attendance` - View attendance data
- `manage_attendance` - Edit attendance records
- `view_schedules` - View production schedules
- `manage_schedules` - Create/edit schedules
- `view_analytics` - Access dashboards and reports
- `manage_settings` - Configure system settings

---

## 4. Functional Requirements

### 4.1 Authentication & Authorization

#### Requirements:

- **AUTH-001**: Users must authenticate via Supabase Auth
- **AUTH-002**: JWT tokens must be validated on every API request
- **AUTH-003**: Role-based access control (RBAC) must be enforced
- **AUTH-004**: Super Admin must bypass all permission checks
- **AUTH-005**: Row Level Security (RLS) must be enforced at database level
- **AUTH-006**: Activity logs must track all user actions

#### Implementation:

```
Frontend: Supabase Auth with Next.js middleware
Backend: Permission checks on API routes
Database: RLS policies on all tables
```

---

### 4.2 User Management

#### Requirements:

- **UM-001**: Admin can create users with email, name, role, and password
- **UM-002**: Admin can edit user details and roles
- **UM-003**: Admin can deactivate users (soft delete)
- **UM-004**: Admin can assign custom permissions to users
- **UM-005**: Users can import employee data from attendance system
- **UM-006**: Activity log must track all user management actions

#### Features:

- User creation with validation
- User listing with search and filters
- User detail pages
- Role assignment
- Custom permission assignment
- Activity log viewer

---

### 4.3 Role & Permission Management

#### Requirements:

- **RP-001**: Admin can create custom roles
- **RP-002**: Admin can assign permissions to roles
- **RP-003**: Admin can edit role definitions
- **RP-004**: Admin can delete roles (if not in use)
- **RP-005**: Default roles: Super Admin, Admin, Operator, Monitor, Attendance
- **RP-006**: Permissions must be granular per feature

#### Features:

- Role creation and editing
- Permission checkboxes per feature
- Role assignment to users
- Role validation (cannot delete in-use roles)

---

### 4.4 Attendance Tracking (CRITICAL - LIVE)

#### Requirements:

- **AT-001**: System must sync with SmartOffice biometric devices every 5 seconds
- **AT-002**: Attendance data must be stored in real-time
- **AT-003**: System must handle 13,000+ attendance records
- **AT-004**: Employee master data must be synchronized
- **AT-005**: Analytics and reports must be available
- **AT-006**: **DO NOT MODIFY** sync system without approval

#### Features:

- Real-time attendance sync (running on office computer)
- Attendance log viewer with date range filters
- Employee master data management
- Attendance analytics dashboard
- Attendance reports and exports
- Device monitoring

#### Critical System Components:

- **Location**: `/set-upx3/` folder (deployed on office computer)
- **API Endpoints**: `/app/api/sync-attendance/`, `/app/api/attendance-analytics/`
- **Database Tables**: `attendance_logs`, `employee_master`
- **External System**: SmartOffice API (localhost:84)

---

### 4.5 Production Scheduling

#### Requirements:

- **PS-001**: Admin can create production orders
- **PS-002**: Admin can allocate machines to jobs
- **PS-003**: Admin can view and edit production schedules
- **PS-004**: System must track machine status
- **PS-005**: System must support job priorities
- **PS-006**: Schedule optimization must be available

#### Features:

- Production order management
- Machine allocation
- Job scheduling
- Schedule timeline view
- Production calendar
- Machine status monitoring

---

### 4.6 Personnel Management

#### Requirements:

- **PM-001**: Admin can manage employee information
- **PM-002**: Admin can assign employees to shifts
- **PM-003**: Admin can manage shift templates
- **PM-004**: Admin can create rotation profiles
- **PM-005**: Admin can manage leave requests
- **PM-006**: Roster board must show employee assignments

#### Features:

- Employee master data
- Shift templates manager
- Rotation profiles builder
- Roster board (daily view)
- Calendar preview (4-week view)
- Employee assignment modal
- Leave management system

---

### 4.7 Monitoring & Maintenance

#### Requirements:

- **MM-001**: Admin can view maintenance schedules
- **MM-002**: Admin can track quality metrics
- **MM-003**: Admin can generate reports
- **MM-004**: Admin can configure alerts
- **MM-005**: System must log all monitoring activities

#### Features:

- Maintenance scheduling
- Quality tracking
- Report generation
- Alert management
- System health monitoring

---

### 4.8 Analytics & Reporting

#### Requirements:

- **AR-001**: Dashboard must show real-time metrics
- **AR-002**: Charts must visualize key performance indicators
- **AR-003**: Reports must be exportable (Excel)
- **AR-004**: Analytics must filter by date, department, employee
- **AR-005**: Performance metrics must be calculated accurately

#### Features:

- Real-time dashboard
- Attendance analytics
- Production analytics
- Chart visualizations
- Report exports
- Custom date range filters

---

### 4.9 System Settings

#### Requirements:

- **SS-001**: Admin can configure system-wide settings
- **SS-002**: Users can manage their own preferences
- **SS-003**: Activity logs must be accessible
- **SS-004**: Settings must be validated before saving

#### Features:

- System settings page
- User preferences (theme, language)
- Activity logs viewer
- Audit trail

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Requirement                 | Target                    |
| --------------------------- | ------------------------- |
| **Dashboard Load Time**     | < 2 seconds               |
| **API Response Time**       | < 500ms (95th percentile) |
| **Attendance Sync Latency** | < 5 seconds               |
| **Concurrent Users**        | 100+                      |
| **Database Queries**        | < 200ms (average)         |

### 5.2 Security

| Requirement                  | Implementation                      |
| ---------------------------- | ----------------------------------- |
| **Authentication**           | Supabase Auth with JWT tokens       |
| **Authorization**            | RBAC with granular permissions      |
| **Data Encryption**          | TLS 1.3 in transit, AES-256 at rest |
| **Input Validation**         | Zod schemas on all inputs           |
| **SQL Injection Prevention** | Parameterized queries, RLS          |
| **Audit Logging**            | All user actions logged             |

### 5.3 Reliability

| Requirement        | Target                  |
| ------------------ | ----------------------- |
| **System Uptime**  | 99.5%                   |
| **Data Backup**    | Daily automated backups |
| **Error Handling** | Graceful degradation    |
| **Recovery Time**  | < 1 hour                |

### 5.4 Scalability

| Requirement            | Current    | Future Target     |
| ---------------------- | ---------- | ----------------- |
| **Concurrent Users**   | 100+       | 500+              |
| **Attendance Records** | 13,000+    | 100,000+          |
| **Database Storage**   | PostgreSQL | Add read replicas |

### 5.5 Usability

| Requirement           | Implementation        |
| --------------------- | --------------------- |
| **Responsive Design** | Mobile-first approach |
| **Accessibility**     | WCAG 2.1 AA compliant |
| **User Onboarding**   | Built-in help system  |
| **Error Messages**    | Clear and actionable  |

---

## 6. Technical Architecture

### 6.1 Technology Stack

#### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Components**: Radix UI, Shadcn/ui
- **Styling**: Tailwind CSS 4
- **State Management**: React Context + Hooks
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts

#### Backend

- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Edge Functions**: Supabase Edge Functions
- **API**: Next.js API Routes
- **Real-time**: Supabase Realtime

#### Deployment

- **Platform**: Vercel
- **CI/CD**: GitHub Actions
- **Monitoring**: Vercel Analytics, Speed Insights
- **Error Tracking**: (TODO: Add Sentry)

### 6.2 Database Schema

#### Key Tables

- `profiles` - User profiles
- `roles` - System roles
- `permissions` - Available permissions
- `user_roles` - User-role mapping
- `user_permissions` - Custom permissions
- `attendance_logs` - Attendance records
- `employee_master` - Employee data
- `audit_logs` - System audit trail

### 6.3 Security Layers

1. **Frontend** - Route protection, UI-level checks
2. **API Middleware** - Backend permission verification
3. **Database** - Row Level Security (RLS)
4. **Input Validation** - Zod schemas

---

## 7. API Specifications

### 7.1 Authentication

- **Type**: Bearer Token (JWT)
- **Header**: `Authorization: Bearer <token>`
- **Expiry**: 1 hour (refresh token support)

### 7.2 Admin APIs

- `POST /api/admin/create-user` - Create user
- `POST /api/admin/delete-user` - Delete user
- `GET /api/admin/users` - List users

### 7.3 Attendance APIs

- `GET /api/attendance` - Get attendance data
- `POST /api/sync-database` - Sync attendance
- `GET /api/attendance-analytics` - Analytics

### 7.4 Schedule APIs

- `GET /api/schedules` - Get schedules
- `POST /api/schedules` - Create schedule
- `PUT /api/schedules/:id` - Update schedule

### 7.5 Error Responses

- **400** - Bad Request (validation error)
- **401** - Unauthorized (invalid token)
- **403** - Forbidden (insufficient permissions)
- **500** - Internal Server Error

---

## 8. Deployment & Infrastructure

### 8.1 Environments

| Environment     | URL                  | Purpose                |
| --------------- | -------------------- | ---------------------- |
| **Development** | localhost:3000       | Local development      |
| **Staging**     | (TBD)                | Pre-production testing |
| **Production**  | (Deployed on Vercel) | Live system            |

### 8.2 Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 8.3 Deployment Process

1. **Development**: `npm run dev`
2. **Build**: `npm run build`
3. **Production Push**: Git push triggers Vercel deployment
4. **Attendance Sync**: Running on office computer (`/set-upx3/`)

---

## 9. Testing Requirements

### 9.1 Test Coverage

- **Unit Tests**: 80%+ coverage (TODO)
- **Integration Tests**: Key user flows
- **E2E Tests**: Critical paths (TODO)

### 9.2 Test Categories

- Component tests (React Testing Library)
- API tests (Jest)
- Security tests (Permission checks)
- Performance tests (Load testing)

### 9.3 Test Commands

```bash
npm test              # Run tests
npm run test:coverage # Coverage report
npm run lint          # Linting
npm run type-check    # TypeScript checking
```

---

## 10. Monitoring & Maintenance

### 10.1 Monitoring

- **Application Health**: Vercel Analytics
- **Performance**: Vercel Speed Insights
- **Errors**: (TODO: Add Sentry)
- **Database**: Supabase dashboard

### 10.2 Logs

- **Application Logs**: Vercel logs
- **Audit Logs**: Database table `audit_logs`
- **Attendance Sync**: Log files in `/set-upx3/`

### 10.3 Backup Strategy

- **Database**: Daily automated backups (Supabase)
- **Retention**: 30 days
- **Restore**: Point-in-time recovery available

---

## 11. Known Limitations

### 11.1 Current Limitations

1. **Automated Testing**: Test suite not fully implemented
2. **API Documentation**: Partial documentation available
3. **Mobile App**: Not yet developed
4. **Rate Limiting**: Not implemented
5. **Error Tracking**: Sentry not integrated

### 11.2 Critical Systems

⚠️ **DO NOT MODIFY** without approval:

- `/set-upx3/` folder (attendance sync system)
- `/app/api/sync-attendance/` endpoints
- `/app/api/attendance-analytics/` endpoints
- Database tables: `attendance_logs`, `employee_master`

Breaking these systems stops ALL attendance data collection!

---

## 12. Future Roadmap

### 12.1 Phase 1: Stabilization (Q1 2026)

- [ ] Complete automated testing suite
- [ ] Add comprehensive API documentation
- [ ] Implement rate limiting
- [ ] Add error tracking (Sentry)
- [ ] Performance optimization

### 12.2 Phase 2: Enhanced Features (Q2 2026)

- [ ] Mobile-responsive design improvements
- [ ] Advanced analytics with ML predictions
- [ ] Custom report builder
- [ ] Notification system
- [ ] Multi-language support

### 12.3 Phase 3: Scaling (Q3-Q4 2026)

- [ ] Mobile app development
- [ ] Database read replicas
- [ ] Redis caching layer
- [ ] Load balancing
- [ ] Multi-tenant support

---

## 13. Success Criteria

### 13.1 Product Success

- ✅ Attendance sync operational (13,000+ records)
- ✅ Multi-module production platform
- ✅ RBAC system with granular permissions
- ⏳ 100+ concurrent users
- ⏳ 99.5% uptime achieved

### 13.2 Business Success

- ✅ Real-time attendance tracking
- ✅ Production scheduling automation
- ✅ Centralized workforce management
- ⏳ Reduced manual scheduling time by 50%
- ⏳ Improved attendance accuracy by 25%

---

## 14. Stakeholders

| Role                     | Name | Responsibilities              |
| ------------------------ | ---- | ----------------------------- |
| **Product Owner**        | TBD  | Overall product direction     |
| **System Administrator** | TBD  | Infrastructure and deployment |
| **Development Lead**     | TBD  | Technical implementation      |
| **QA Lead**              | TBD  | Quality assurance             |
| **Business Analyst**     | TBD  | Requirements gathering        |

---

## 15. Change History

| Date         | Version | Changes              | Author          |
| ------------ | ------- | -------------------- | --------------- |
| Jan 22, 2026 | 1.0.0   | Initial PRD creation | System Analysis |

---

## Appendix A: Glossary

| Term            | Definition                           |
| --------------- | ------------------------------------ |
| **RBAC**        | Role-Based Access Control            |
| **RLS**         | Row Level Security                   |
| **JWT**         | JSON Web Token                       |
| **API**         | Application Programming Interface    |
| **SmartOffice** | Biometric attendance system          |
| **Supabase**    | Backend-as-a-Service platform        |
| **Next.js**     | React framework for web applications |

---

## Appendix B: References

- **README**: `/README.md`
- **Architecture**: `/docs/ARCHITECTURE.md`
- **API Docs**: `/docs/API.md`
- **Setup Guide**: `/docs/SETUP.md`
- **Security**: `/docs/SECURITY.md`
- **Testing**: `/docs/TESTING.md`

---

**Document Status**: ✅ Complete
**Next Review**: February 2026
