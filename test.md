# Test Plan - Epsilon Scheduling System

---

## Document Information

| Field             | Value                     |
| ----------------- | ------------------------- |
| **Project Name**  | Epsilon Scheduling System |
| **Document Type** | Testing Plan              |
| **Version**       | 1.1.0                     |
| **Last Updated**  | January 22, 2026          |
| **Test Lead**     | System Analysis           |

---

## Project Stats (Current)

| Component | Count | Tested | Coverage |
|-----------|-------|--------|----------|
| **Web Pages** | 43 | 3 | 7% |
| **API Endpoints** | 38+ | 1 | 3% |
| **UI Components** | 51 | 1 | 2% |
| **Services** | 8 | 0 | 0% |
| **Middleware** | 7 | 0 | 0% |
| **Mobile Features** | 9 | 1 | 11% |
| **DB Migrations** | 23 | ✅ | N/A |

---

## 1. Executive Summary

This test plan outlines comprehensive testing tasks for the Epsilon Scheduling System, including architecture review, duplicate file mapping, access pattern analysis, and full system audit using Ralphy.

### Key Testing Areas

- Architecture Review
- Duplicate File Analysis & Consolidation
- Access Pattern Analysis (Every Function)
- Function-Level Testing
- Integration Testing
- Security Testing
- Performance Testing

---

## 2. Testing Scope

### 2.1 Architecture Review

| Test ID | Test Description                      | Priority | Status  |
| ------- | ------------------------------------- | -------- | ------- |
| AR-001  | Review project directory structure    | High     | Pending |
| AR-002  | Verify Next.js App Router conventions | High     | Pending |
| AR-003  | Check component organization          | High     | Pending |
| AR-004  | Validate middleware layering          | High     | Pending |
| AR-005  | Review utility file placement         | High     | Pending |
| AR-006  | Verify API route structure            | High     | Pending |
| AR-007  | Check context provider placement      | Medium   | Pending |
| AR-008  | Review type definitions organization  | Medium   | Pending |
| AR-009  | Validate hooks directory structure    | Medium   | Pending |
| AR-010  | Check services layer organization     | Medium   | Pending |

### 2.2 Duplicate File Analysis

| Test ID | Test Description                                   | Priority | Status  |
| ------- | -------------------------------------------------- | -------- | ------- |
| DF-001  | Audit all utils.ts files                           | Critical | Pending |
| DF-002  | Compare `app/lib/utils/utils.ts` vs `lib/utils.ts` | Critical | Pending |
| DF-003  | Compare rate-limiter implementations               | Critical | Pending |
| DF-004  | Compare use-toast hook implementations             | Critical | Pending |
| DF-005  | Compare `app/components/` vs `components/`         | Critical | Pending |
| DF-006  | Find all permissionData.ts duplicates              | High     | Pending |
| DF-007  | Find all middleware file duplicates                | High     | Pending |
| DF-008  | Find all page.tsx duplicates                       | High     | Pending |
| DF-009  | Find all layout.tsx duplicates                     | High     | Pending |
| DF-010  | Create consolidation plan                          | High     | Pending |

### 2.3 Access Pattern Analysis (Every Function)

| Test ID | Test Description                           | Priority | Status  |
| ------- | ------------------------------------------ | -------- | ------- |
| AP-001  | Analyze all API routes for access patterns | Critical | Pending |
| AP-002  | Review all middleware for access control   | Critical | Pending |
| AP-003  | Audit all context providers for access     | Critical | Pending |
| AP-004  | Check all hooks for proper access patterns | Critical | Pending |
| AP-005  | Review all service functions               | Critical | Pending |
| AP-006  | Audit all utility functions                | High     | Pending |
| AP-007  | Review all component props and state       | High     | Pending |
| AP-008  | Check all API client functions             | High     | Pending |
| AP-009  | Review all validation schemas              | High     | Pending |
| AP-010  | Check all type definitions for consistency | High     | Pending |

### 2.4 Function-Level Testing

| Test ID | Test Description                      | Priority | Status  |
| ------- | ------------------------------------- | -------- | ------- |
| FT-001  | Test all auth middleware functions    | Critical | Pending |
| FT-002  | Test all rate limiter functions       | Critical | Pending |
| FT-003  | Test all permission checker functions | Critical | Pending |
| FT-004  | Test all API client functions         | Critical | Pending |
| FT-005  | Test all validation functions         | High     | Pending |
| FT-006  | Test all utility functions            | High     | Pending |
| FT-007  | Test all audit logging functions      | High     | Pending |
| FT-008  | Test all context providers            | High     | Pending |
| FT-009  | Test all custom hooks                 | High     | Pending |
| FT-010  | Test all service layer functions      | High     | Pending |

### 2.5 Integration Testing

| Test ID | Test Description                | Priority | Status  |
| ------- | ------------------------------- | -------- | ------- |
| IT-001  | Test authentication flow        | Critical | Pending |
| IT-002  | Test authorization flow         | Critical | Pending |
| IT-003  | Test attendance sync flow       | Critical | Pending |
| IT-004  | Test user management flow       | High     | Pending |
| IT-005  | Test role management flow       | High     | Pending |
| IT-006  | Test permission management flow | High     | Pending |
| IT-007  | Test scheduling flow            | High     | Pending |
| IT-008  | Test analytics flow             | Medium   | Pending |
| IT-009  | Test report generation flow     | Medium   | Pending |
| IT-010  | Test settings update flow       | Medium   | Pending |

### 2.6 Security Testing

| Test ID | Test Description              | Priority | Status  |
| ------- | ----------------------------- | -------- | ------- |
| ST-001  | Test JWT token validation     | Critical | Pending |
| ST-002  | Test RBAC enforcement         | Critical | Pending |
| ST-003  | Test RLS policies             | Critical | Pending |
| ST-004  | Test input validation         | Critical | Pending |
| ST-005  | Test SQL injection protection | Critical | Pending |
| ST-006  | Test XSS prevention           | High     | Pending |
| ST-007  | Test CSRF protection          | High     | Pending |
| ST-008  | Test rate limiting            | High     | Pending |
| ST-009  | Test security headers         | High     | Pending |
| ST-010  | Test audit logging            | High     | Pending |

### 2.7 Performance Testing

| Test ID | Test Description                  | Priority | Status  |
| ------- | --------------------------------- | -------- | ------- |
| PT-001  | Test API response times           | Critical | Pending |
| PT-002  | Test database query performance   | Critical | Pending |
| PT-003  | Test component render performance | High     | Pending |
| PT-004  | Test concurrent user handling     | High     | Pending |
| PT-005  | Test memory usage                 | Medium   | Pending |
| PT-006  | Test bundle size                  | Medium   | Pending |
| PT-007  | Test First Contentful Paint (FCP) | Medium   | Pending |
| PT-008  | Test Time to Interactive (TTI)    | Medium   | Pending |
| PT-009  | Test rate limiting performance    | Medium   | Pending |
| PT-010  | Test authentication latency       | Medium   | Pending |

### 2.8 Mobile App Testing (NEW)

| Test ID | Test Description                      | Priority | Status  |
| ------- | ------------------------------------- | -------- | ------- |
| MA-001  | Test Flutter Supabase authentication  | Critical | Pending |
| MA-002  | Test dashboard data loading           | Critical | Pending |
| MA-003  | Test attendance feature               | High     | Pending |
| MA-004  | Test roster screen                    | High     | Pending |
| MA-005  | Test personnel management             | High     | Pending |
| MA-006  | Test analytics charts (fl_chart)      | Medium   | Pending |
| MA-007  | Test settings/user management         | Medium   | Pending |
| MA-008  | Test theme switching (dark mode)      | Low      | Pending |
| MA-009  | Test intro/onboarding flow            | Low      | Pending |
| MA-010  | Test GoRouter navigation              | Medium   | Pending |

---

## 3. Testing Tools

### 3.1 Ralphy (AI Coding Loop)

- **Purpose**: Autonomous code review and refactoring
- **Usage**: `ralphy <task>`
- **Integration**: Will be used for systematic code review

### 3.2 Jest (Test Runner)

- **Purpose**: Unit and integration testing
- **Config**: `jest.config.js`
- **Command**: `npm test`

### 3.3 React Testing Library

- **Purpose**: Component testing
- **Usage**: Test React components

### 3.4 TypeScript

- **Purpose**: Type checking
- **Command**: `npx tsc --noEmit`

### 3.5 ESLint

- **Purpose**: Code linting
- **Command**: `npm run lint`

### 3.6 Prettier

- **Purpose**: Code formatting
- **Command**: `npm run format`

---

## 4. Duplicate File Analysis Details

### 4.1 Identified Duplicates

#### 4.1.1 Utils Files

| File Path                | Content         | Duplicate | Action      |
| ------------------------ | --------------- | --------- | ----------- |
| `app/lib/utils/utils.ts` | `cn()` function | Yes       | Consolidate |
| `lib/utils.ts`           | `cn()` function | Yes       | Consolidate |

**Recommendation**: Keep `lib/utils.ts`, remove `app/lib/utils/utils.ts`, update imports.

#### 4.1.2 Rate Limiter Files

| File Path                            | Content             | Action      |
| ------------------------------------ | ------------------- | ----------- |
| `app/lib/rate-limiter.ts`            | Class-based limiter | Consolidate |
| `app/lib/middleware/rate-limiter.ts` | Function-based      | Consolidate |

**Recommendation**: Keep `app/lib/middleware/rate-limiter.ts`, remove `app/lib/rate-limiter.ts`.

#### 4.1.3 Toast Hook Files

| File Path                    | Content    | Action      |
| ---------------------------- | ---------- | ----------- |
| `app/lib/hooks/use-toast.ts` | Toast hook | Consolidate |
| `components/ui/use-toast.ts` | Toast hook | Consolidate |

**Recommendation**: Keep `components/ui/use-toast.ts` (UI component), remove `app/lib/hooks/use-toast.ts`.

#### 4.1.4 Component Directories

| Directory         | Content                 | Action |
| ----------------- | ----------------------- | ------ |
| `app/components/` | App-specific components | Merge  |
| `components/`     | Shared components       | Merge  |

**Recommendation**:

- Keep `components/` for shared components
- Keep `app/components/` for app-specific components only
- Move shared components from `app/components/` to `components/`

#### 4.1.5 PermissionData Files

| File Path                                        | Content         | Action      |
| ------------------------------------------------ | --------------- | ----------- |
| `app/settings/roles/permissionData.ts`           | Permission data | Consolidate |
| `app/settings/roles/[id]/edit/permissionData.ts` | Permission data | Consolidate |

**Recommendation**: Create shared `lib/config/permissionData.ts`.

---

## 5. Access Pattern Analysis

### 5.1 All Functions to Analyze

#### 5.1.1 API Routes (`app/api/`)

- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management endpoints
- `/api/roles/*` - Role management endpoints
- `/api/permissions/*` - Permission management endpoints
- `/api/attendance/*` - Attendance endpoints
- `/api/schedules/*` - Scheduling endpoints
- `/api/sync-attendance/*` - Attendance sync (CRITICAL - DO NOT MODIFY)

#### 5.1.2 Middleware (`app/lib/middleware/`)

- `auth.middleware.ts` - Authentication checks
- `rate-limiter.middleware.ts` - Rate limiting
- `security-headers.ts` - Security headers
- `csrf-protection.ts` - CSRF protection
- `validation.middleware.ts` - Input validation

#### 5.1.3 Services (`app/lib/services/`)

- `supabase-client.ts` - Supabase client initialization
- `supabase-server.ts` - Server-side Supabase client

#### 5.1.4 Hooks (`app/lib/hooks/`)

- `useAdmin.ts` - Admin hook
- `use-toast.ts` - Toast hook (DUPLICATE)
- `use-mobile.ts` - Mobile detection hook

#### 5.1.5 Contexts (`app/lib/contexts/`)

- `auth-context.tsx` - Authentication context
- `toast-context.tsx` - Toast context
- `theme-context.tsx` - Theme context

#### 5.1.6 Utilities (`app/lib/utils/`)

- `api-client.ts` - API client functions
- `api-response.ts` - API response helpers
- `audit-logger.ts` - Audit logging
- `permission-checker.ts` - Permission checking
- `permission-levels.ts` - Permission level definitions
- `userCreation.ts` - User creation utilities
- `utils.ts` - General utilities (DUPLICATE)

#### 5.1.7 Validation (`app/lib/validation/`)

- `schemas.ts` - Zod validation schemas
- `security-schemas.ts` - Security validation

---

## 6. Ralphy Testing Tasks

### 6.1 Using Ralphy for System Review

```bash
# Initialize Ralphy
ralphy --init

# Run specific audit tasks
ralphy --opencode "Analyze architecture and identify duplicate files"
ralphy --opencode "Review access patterns in all functions"
ralphy --opencode "Audit security middleware implementations"
ralphy --opencode "Check rate limiter implementations"
ralphy --opencode "Review authentication flow"
ralphy --opencode "Audit authorization and RBAC implementation"
ralphy --opencode "Review API client functions"
ralphy --opencode "Check validation schemas"
ralphy --opencode "Audit permission checking functions"
ralphy --opencode "Review component organization"
```

### 6.2 Ralphy Configuration

```yaml
# .ralphy/config.yml (if needed)
max_iterations: 0
skip_tests: false
skip_lint: false
verbose: true
```

---

## 7. Test Execution Plan

### 7.1 Phase 1: Architecture & Duplicate Analysis (Week 1)

| Day   | Tasks                                  |
| ----- | -------------------------------------- |
| Day 1 | AR-001, AR-002, AR-003, DF-001, DF-002 |
| Day 2 | AR-004, AR-005, AR-006, DF-003, DF-004 |
| Day 3 | AR-007, AR-008, AR-009, DF-005, DF-006 |
| Day 4 | AR-010, DF-007, DF-008, DF-009, DF-010 |
| Day 5 | Consolidation plan implementation      |

### 7.2 Phase 2: Access Pattern Analysis (Week 2)

| Day   | Tasks                  |
| ----- | ---------------------- |
| Day 1 | AP-001, AP-002, AP-003 |
| Day 2 | AP-004, AP-005, AP-006 |
| Day 3 | AP-007, AP-008, AP-009 |
| Day 4 | AP-010, FT-001, FT-002 |
| Day 5 | FT-003, FT-004, FT-005 |

### 7.3 Phase 3: Function & Integration Testing (Week 3)

| Day   | Tasks                  |
| ----- | ---------------------- |
| Day 1 | FT-006, FT-007, FT-008 |
| Day 2 | FT-009, FT-010, IT-001 |
| Day 3 | IT-002, IT-003, IT-004 |
| Day 4 | IT-005, IT-006, IT-007 |
| Day 5 | IT-008, IT-009, IT-010 |

### 7.4 Phase 4: Security & Performance Testing (Week 4)

| Day   | Tasks                                                  |
| ----- | ------------------------------------------------------ |
| Day 1 | ST-001, ST-002, ST-003                                 |
| Day 2 | ST-004, ST-005, ST-006                                 |
| Day 3 | ST-007, ST-008, ST-009                                 |
| Day 4 | PT-001, PT-002, PT-003                                 |
| Day 5 | PT-004, PT-005, PT-006, PT-007, PT-008, PT-009, PT-010 |

---

## 8. Test Environment

### 8.1 Environments

| Environment | URL                 | Purpose        |
| ----------- | ------------------- | -------------- |
| Development | localhost:3000      | Local testing  |
| Staging     | (TBD)               | Pre-production |
| Production  | (Vercel deployment) | Live system    |

### 8.2 Test Data

- **Test Users**: Use `create_test_user.js` script
- **Test Attendance**: Use existing attendance logs
- **Test Roles/Permissions**: Use existing RBAC setup

---

## 9. Success Criteria

### 9.1 Architecture

- ✅ All duplicate files consolidated
- ✅ Directory structure follows Next.js conventions
- ✅ No circular dependencies
- ✅ All imports resolved correctly

### 9.2 Access Patterns

- ✅ All functions properly authenticated
- ✅ All functions properly authorized
- ✅ No security vulnerabilities
- ✅ Consistent access patterns

### 9.3 Testing

- ✅ 80%+ code coverage achieved
- ✅ All tests passing
- ✅ No critical issues found
- ✅ Performance benchmarks met

### 9.4 Quality

- ✅ Zero ESLint errors
- ✅ Zero TypeScript errors
- ✅ All security checks passed
- ✅ Performance optimization completed

---

## 10. Reporting

### 10.1 Test Reports

- **Daily Progress**: Document completed tests
- **Weekly Summary**: Comprehensive weekly report
- **Final Report**: Complete testing results

### 10.2 Issue Tracking

- Use GitHub Issues for tracking
- Label with `testing`, `bug`, `enhancement`
- Link to specific test IDs

---

## 11. Critical Notes

### 11.1 DO NOT MODIFY

⚠️ **CRITICAL**: Do not modify these systems without approval:

- `/set-upx3/` folder (attendance sync system)
- `/app/api/sync-attendance/` endpoints
- `/app/api/attendance-analytics/` endpoints
- Database tables: `attendance_logs`, `employee_master`

### 11.2 Safety Checks

- Always backup before making changes
- Test in development first
- Get approval for critical changes
- Review all consolidations

---

## 12. Next Steps

1. ✅ Create test plan (This document)
2. ⏳ Execute Phase 1 (Architecture & Duplicate Analysis)
3. ⏳ Execute Phase 2 (Access Pattern Analysis)
4. ⏳ Execute Phase 3 (Function & Integration Testing)
5. ⏳ Execute Phase 4 (Security & Performance Testing)
6. ⏳ Generate final report
7. ⏳ Implement fixes based on findings

---

**Document Status**: ✅ Complete
**Next Review**: After Phase 1 completion

---

## Appendix A: Quick Reference Commands

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Format code
npm run format

# Build
npm run build

# Ralphy commands
ralphy --opencode "Analyze architecture"
ralphy --opencode "Check duplicate files"
ralphy --opencode "Review access patterns"
```

---

## Appendix B: File Structure Reference

```
epsilonschedulingmain/
├── app/
│   ├── api/                    # API routes
│   ├── components/             # App-specific components
│   ├── lib/                    # App-specific lib
│   │   ├── contexts/           # Context providers
│   │   ├── hooks/              # Custom hooks
│   │   ├── middleware/         # Middleware
│   │   ├── services/           # Services
│   │   ├── utils/              # Utilities
│   │   └── validation/         # Validation schemas
│   ├── settings/               # Settings pages
│   ├── tools/                  # Tools pages
│   └── types/                  # Type definitions
├── components/                  # Shared components
│   ├── ui/                     # UI components
│   └── fir/                    # FIR components
├── lib/                        # Shared lib
│   └── utils.ts                # Shared utilities
├── supabase/                   # Supabase config
├── docs/                       # Documentation
└── scripts/                    # Scripts
```
