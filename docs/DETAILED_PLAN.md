# Detailed Plan - Epsilon Scheduling System

---

## Document Information

| Field             | Value                     |
| ----------------- | ------------------------- |
| **Project Name**  | Epsilon Scheduling System |
| **Document Type** | Detailed Plan             |
| **Version**       | 1.1.0                     |
| **Last Updated**  | January 22, 2026          |
| **Project Lead**  | System Analysis           |

### Current Project Stats

| Component | Count | Status |
|-----------|-------|--------|
| Web Pages | 43 | ✅ Active |
| API Endpoints | 38+ | ✅ Active |
| Mobile Features | 9 | ✅ Active |
| Tests Written | 3 | ⚠️ Low |

---

## 1. Executive Summary

This document provides a detailed plan for reviewing and improving the Epsilon Scheduling System architecture, focusing on duplicate file consolidation, access pattern analysis, and comprehensive system audit using Ralphy.

### Plan Overview

- **Phase 1**: Analysis & Assessment (Week 1)
- **Phase 2**: Consolidation (Week 2)
- **Phase 3**: Testing & Validation (Week 3)
- **Phase 4**: Documentation & Handoff (Week 4)
- **Phase 5**: Mobile App Testing (Week 5) - NEW

---

## 2. Phase 1: Analysis & Assessment (Week 1)

### 2.1 Day 1: Duplicate File Analysis

#### 2.1.1 Tasks

| Time        | Task                                    | Owner  | Status  |
| ----------- | --------------------------------------- | ------ | ------- |
| 09:00-10:00 | Run Ralphy for duplicate file detection | System | Pending |
| 10:00-12:00 | Manual review of identified duplicates  | System | Pending |
| 13:00-14:00 | Document duplicate files                | System | Pending |
| 14:00-16:00 | Analyze duplicate content differences   | System | Pending |
| 16:00-17:00 | Create impact assessment                | System | Pending |

#### 2.1.2 Commands

```bash
# Ralphy duplicate detection
ralphy --opencode "Identify all duplicate files in the codebase"

# Manual duplicate file search
find ./app ./components ./lib -type f \( -name "*.ts" -o -name "*.tsx" \) | xargs -I {} basename {} | sort | uniq -d

# Compare specific duplicates
diff app/lib/utils/utils.ts lib/utils.ts
diff app/lib/rate-limiter.ts app/lib/middleware/rate-limiter.ts
diff app/lib/hooks/use-toast.ts components/ui/use-toast.ts
```

#### 2.1.3 Expected Deliverables

- [ ] List of all duplicate files
- [ ] Content comparison for each duplicate
- [ ] Impact assessment (High/Medium/Low)
- [ ] Consolidation priority matrix

---

### 2.2 Day 2: Access Pattern Analysis

#### 2.2.1 Tasks

| Time        | Task                              | Owner  | Status  |
| ----------- | --------------------------------- | ------ | ------- |
| 09:00-11:00 | Review API route access patterns  | System | Pending |
| 11:00-12:00 | Review middleware access patterns | System | Pending |
| 13:00-14:30 | Review services access patterns   | System | Pending |
| 14:30-16:00 | Review hooks and contexts         | System | Pending |
| 16:00-17:00 | Document access pattern issues    | System | Pending |

#### 2.2.2 Commands

```bash
# Ralphy access pattern review
ralphy --opencode "Review access patterns in all API routes"
ralphy --opencode "Review access patterns in all middleware"
ralphy --opencode "Review access patterns in all services"

# Manual review
# Check all API routes for authentication
grep -r "export.*async.*function" app/api/ --include="*.ts" --include="*.tsx"

# Check all middleware functions
grep -r "export.*function" app/lib/middleware/ --include="*.ts"
```

#### 2.2.3 Expected Deliverables

- [ ] List of all functions requiring access pattern review
- [ ] Identified security vulnerabilities
- [ ] Missing authentication/authorization issues
- [ ] Inconsistent access patterns

---

### 2.3 Day 3: Architecture Review

#### 2.3.1 Tasks

| Time        | Task                            | Owner  | Status  |
| ----------- | ------------------------------- | ------ | ------- |
| 09:00-10:30 | Review directory structure      | System | Pending |
| 10:30-12:00 | Check for circular dependencies | System | Pending |
| 13:00-14:30 | Review import paths             | System | Pending |
| 14:30-16:00 | Analyze component organization  | System | Pending |
| 16:00-17:00 | Document architecture issues    | System | Pending |

#### 2.3.2 Commands

```bash
# Ralphy architecture review
ralphy --opencode "Review project architecture for structural issues"
ralphy --opencode "Check for circular dependencies"
ralphy --opencode "Review import paths and resolve all references"

# Manual checks
# Directory tree
tree -L 3 -I 'node_modules'

# Check TypeScript imports
npx tsc --noEmit --pretty

# Check for circular dependencies
npx madge --circular --extensions ts,tsx .
```

#### 2.3.3 Expected Deliverables

- [ ] Architecture issues list
- [ ] Circular dependency report
- [ ] Import path inconsistencies
- [ ] Component organization recommendations

---

### 2.4 Day 4: Create Consolidation Plan

#### 2.4.1 Tasks

| Time        | Task                                 | Owner  | Status  |
| ----------- | ------------------------------------ | ------ | ------- |
| 09:00-11:00 | Create file consolidation plan       | System | Pending |
| 11:00-12:00 | Create access pattern fix plan       | System | Pending |
| 13:00-14:30 | Create architecture improvement plan | System | Pending |
| 14:30-16:00 | Create testing plan                  | System | Pending |
| 16:00-17:00 | Consolidate all plans                | System | Pending |

#### 2.4.2 Deliverables

- [ ] File consolidation plan
- [ ] Access pattern fix plan
- [ ] Architecture improvement plan
- [ ] Testing plan (test.md)
- [ ] Master plan document

---

### 2.5 Day 5: Review and Approve

#### 2.5.1 Tasks

| Time        | Task                           | Owner  | Status  |
| ----------- | ------------------------------ | ------ | ------- |
| 09:00-11:00 | Review all plans               | System | Pending |
| 11:00-12:00 | Identify risks and mitigations | System | Pending |
| 13:00-14:30 | Create rollback plan           | System | Pending |
| 14:30-16:00 | Get approval from stakeholders | System | Pending |
| 16:00-17:00 | Finalize plans                 | System | Pending |

#### 2.5.2 Deliverables

- [ ] Approved consolidation plan
- [ ] Approved testing plan
- [ ] Risk assessment
- [ ] Rollback plan

---

## 3. Phase 2: Consolidation (Week 2)

### 3.1 Day 1: Utils Consolidation

#### 3.1.1 Tasks

| Time        | Task                                         | Owner  | Status  |
| ----------- | -------------------------------------------- | ------ | ------- |
| 09:00-10:00 | Backup current state                         | System | Pending |
| 10:00-11:00 | Find all imports of `app/lib/utils/utils.ts` | System | Pending |
| 11:00-12:00 | Update all imports to `lib/utils`            | System | Pending |
| 13:00-14:00 | Remove `app/lib/utils/utils.ts`              | System | Pending |
| 14:00-15:00 | Run tests                                    | System | Pending |
| 15:00-16:00 | Run type check and lint                      | System | Pending |
| 16:00-17:00 | Fix any issues                               | System | Pending |

#### 3.1.2 Commands

```bash
# Backup
git add -A
git commit -m "Backup before utils consolidation"

# Find imports
grep -r "from.*app/lib/utils/utils" --include="*.ts" --include="*.tsx"

# Update imports (manual)
# Update all imports from "@/app/lib/utils/utils" to "@/lib/utils"

# Remove file
rm app/lib/utils/utils.ts

# Test
npm test
npx tsc --noEmit
npm run lint

# Build
npm run build
```

#### 3.1.3 Rollback

```bash
# If issues occur
git reset --hard HEAD
```

---

### 3.2 Day 2: Rate Limiter Consolidation

#### 3.2.1 Tasks

| Time        | Task                                          | Owner  | Status  |
| ----------- | --------------------------------------------- | ------ | ------- |
| 09:00-10:00 | Backup current state                          | System | Pending |
| 10:00-11:00 | Find all imports of `app/lib/rate-limiter.ts` | System | Pending |
| 11:00-12:00 | Update all imports                            | System | Pending |
| 13:00-14:00 | Create convenience wrappers                   | System | Pending |
| 14:00-15:00 | Remove `app/lib/rate-limiter.ts`              | System | Pending |
| 15:00-16:00 | Run tests                                     | System | Pending |
| 16:00-17:00 | Fix any issues                                | System | Pending |

#### 3.2.2 Commands

```bash
# Backup
git add -A
git commit -m "Backup before rate limiter consolidation"

# Find imports
grep -r "from.*app/lib/rate-limiter" --include="*.ts" --include="*.tsx"

# Update imports (manual)
# Create convenience wrappers in app/lib/middleware/rate-limiter.ts

# Remove file
rm app/lib/rate-limiter.ts

# Test
npm test
npx tsc --noEmit
npm run lint
npm run build
```

---

### 3.3 Day 3: Toast Hook Consolidation

#### 3.3.1 Tasks

| Time        | Task                                             | Owner  | Status  |
| ----------- | ------------------------------------------------ | ------ | ------- |
| 09:00-10:00 | Backup current state                             | System | Pending |
| 10:00-11:00 | Find all imports of `app/lib/hooks/use-toast.ts` | System | Pending |
| 11:00-12:00 | Update all imports to `components/ui/use-toast`  | System | Pending |
| 13:00-14:00 | Remove `app/lib/hooks/use-toast.ts`              | System | Pending |
| 14:00-15:00 | Run tests                                        | System | Pending |
| 15:00-16:00 | Run type check and lint                          | System | Pending |
| 16:00-17:00 | Fix any issues                                   | System | Pending |

#### 3.3.2 Commands

```bash
# Backup
git add -A
git commit -m "Backup before toast hook consolidation"

# Find imports
grep -r "from.*app/lib/hooks/use-toast" --include="*.ts" --include="*.tsx"

# Update imports (manual)
# Update all imports from "@/app/lib/hooks/use-toast" to "@/components/ui/use-toast"

# Remove file
rm app/lib/hooks/use-toast.ts

# Test
npm test
npx tsc --noEmit
npm run lint
npm run build
```

---

### 3.4 Day 4: Component Directory Consolidation

#### 3.4.1 Tasks

| Time        | Task                                                    | Owner  | Status  |
| ----------- | ------------------------------------------------------- | ------ | ------- |
| 09:00-10:00 | Backup current state                                    | System | Pending |
| 10:00-11:00 | Move `app/components/zoho-ui/` to `components/zoho-ui/` | System | Pending |
| 11:00-12:00 | Move `app/components/charts/` to `components/charts/`   | System | Pending |
| 13:00-14:00 | Consolidate auth components                             | System | Pending |
| 14:00-15:00 | Update all imports                                      | System | Pending |
| 15:00-16:00 | Run tests                                               | System | Pending |
| 16:00-17:00 | Fix any issues                                          | System | Pending |

#### 3.4.2 Commands

```bash
# Backup
git add -A
git commit -m "Backup before component consolidation"

# Move directories
mv app/components/zoho-ui components/
mv app/components/charts components/

# Consolidate auth components
# Review app/components/auth/ and components/auth/
# Merge as needed

# Update imports (manual)
# Update all imports referencing moved components

# Test
npm test
npx tsc --noEmit
npm run lint
npm run build
```

---

### 3.5 Day 5: Permission Data Consolidation

#### 3.5.1 Tasks

| Time        | Task                                  | Owner  | Status  |
| ----------- | ------------------------------------- | ------ | ------- |
| 09:00-10:00 | Backup current state                  | System | Pending |
| 10:00-11:00 | Create `lib/config/permissionData.ts` | System | Pending |
| 11:00-12:00 | Move content from duplicates          | System | Pending |
| 13:00-14:00 | Remove duplicates                     | System | Pending |
| 14:00-15:00 | Update all imports                    | System | Pending |
| 15:00-16:00 | Run tests                             | System | Pending |
| 16:00-17:00 | Fix any issues                        | System | Pending |

#### 3.5.2 Commands

```bash
# Backup
git add -A
git commit -m "Backup before permission data consolidation"

# Create directory
mkdir -p lib/config

# Create new file
# Create lib/config/permissionData.ts

# Move content
# Copy content from app/settings/roles/permissionData.ts

# Remove duplicates
rm app/settings/roles/permissionData.ts
rm app/settings/roles/[id]/edit/permissionData.ts

# Update imports (manual)

# Test
npm test
npx tsc --noEmit
npm run lint
npm run build
```

---

## 4. Phase 3: Testing & Validation (Week 3)

### 4.1 Day 1: Post-Consolidation Testing

#### 4.1.1 Tasks

| Time        | Task                  | Owner  | Status  |
| ----------- | --------------------- | ------ | ------- |
| 09:00-10:00 | Run full test suite   | System | Pending |
| 10:00-11:00 | Run type checking     | System | Pending |
| 11:00-12:00 | Run linting           | System | Pending |
| 13:00-14:30 | Build project         | System | Pending |
| 14:30-16:00 | Manual smoke test     | System | Pending |
| 16:00-17:00 | Document test results | System | Pending |

#### 4.1.2 Commands

```bash
# Full test suite
npm test

# Test with coverage
npm run test:coverage

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Build
npm run build

# Smoke test
npm run dev
# Test: http://localhost:3000
```

---

### 4.2 Day 2: Access Pattern Testing

#### 4.2.1 Tasks

| Time        | Task                          | Owner  | Status  |
| ----------- | ----------------------------- | ------ | ------- |
| 09:00-10:30 | Test API route authentication | System | Pending |
| 10:30-12:00 | Test API route authorization  | System | Pending |
| 13:00-14:30 | Test middleware security      | System | Pending |
| 14:30-16:00 | Test permission enforcement   | System | Pending |
| 16:00-17:00 | Document test results         | System | Pending |

#### 4.2.2 Commands

```bash
# Ralphy security testing
ralphy --opencode "Test all API routes for proper authentication"
ralphy --opencode "Test all API routes for proper authorization"
ralphy --opencode "Test middleware for security vulnerabilities"
ralphy --opencode "Test permission enforcement"

# Manual testing
# Test each API endpoint for:
# - Authentication required
# - Authorization required
# - Proper error handling
```

---

### 4.3 Day 3: Integration Testing

#### 4.3.1 Tasks

| Time        | Task                      | Owner  | Status  |
| ----------- | ------------------------- | ------ | ------- |
| 09:00-11:00 | Test authentication flow  | System | Pending |
| 11:00-12:00 | Test user management flow | System | Pending |
| 13:00-14:30 | Test role management flow | System | Pending |
| 14:30-16:00 | Test attendance flow      | System | Pending |
| 16:00-17:00 | Document test results     | System | Pending |

#### 4.3.2 Test Scenarios

1. **Authentication Flow**:
   - Login with valid credentials
   - Login with invalid credentials
   - Logout
   - Session refresh

2. **User Management Flow**:
   - Create user
   - Edit user
   - Deactivate user
   - Assign roles

3. **Role Management Flow**:
   - Create role
   - Assign permissions
   - Edit role
   - Delete role

4. **Attendance Flow**:
   - View attendance logs
   - Filter attendance
   - Export attendance
   - View analytics

---

### 4.4 Day 4: Security Testing

#### 4.4.1 Tasks

| Time        | Task                      | Owner  | Status  |
| ----------- | ------------------------- | ------ | ------- |
| 09:00-10:30 | Test JWT token validation | System | Pending |
| 10:30-12:00 | Test RBAC enforcement     | System | Pending |
| 13:00-14:30 | Test input validation     | System | Pending |
| 14:30-16:00 | Test rate limiting        | System | Pending |
| 16:00-17:00 | Document test results     | System | Pending |

#### 4.4.2 Security Tests

| Test Type        | Description                       | Status  |
| ---------------- | --------------------------------- | ------- |
| JWT Validation   | Test token expiration and refresh | Pending |
| RBAC             | Test role-based access control    | Pending |
| Input Validation | Test for SQL injection, XSS       | Pending |
| Rate Limiting    | Test rate limit enforcement       | Pending |
| CSRF             | Test CSRF protection              | Pending |
| Security Headers | Test security header presence     | Pending |

---

### 4.5 Day 5: Performance Testing

#### 4.5.1 Tasks

| Time        | Task                              | Owner  | Status  |
| ----------- | --------------------------------- | ------ | ------- |
| 09:00-10:30 | Test API response times           | System | Pending |
| 10:30-12:00 | Test database query performance   | System | Pending |
| 13:00-14:30 | Test component render performance | System | Pending |
| 14:30-16:00 | Test bundle size                  | System | Pending |
| 16:00-17:00 | Document test results             | System | Pending |

#### 4.5.2 Performance Benchmarks

| Metric                 | Target  | Actual | Status  |
| ---------------------- | ------- | ------ | ------- |
| Dashboard Load Time    | < 2s    | TBD    | Pending |
| API Response Time      | < 500ms | TBD    | Pending |
| Database Query         | < 200ms | TBD    | Pending |
| First Contentful Paint | < 1.5s  | TBD    | Pending |
| Time to Interactive    | < 3s    | TBD    | Pending |

---

## 5. Phase 4: Documentation & Handoff (Week 4)

### 5.1 Day 1: Update Documentation

#### 5.1.1 Tasks

| Time        | Task                            | Owner  | Status  |
| ----------- | ------------------------------- | ------ | ------- |
| 09:00-11:00 | Update README.md                | System | Pending |
| 11:00-12:00 | Update ARCHITECTURE.md          | System | Pending |
| 13:00-14:30 | Create CONSOLIDATION_SUMMARY.md | System | Pending |
| 14:30-16:00 | Update PRD.md                   | System | Pending |
| 16:00-17:00 | Review documentation            | System | Pending |

---

### 5.2 Day 2: Create Runbooks

#### 5.2.1 Tasks

| Time        | Task                         | Owner  | Status  |
| ----------- | ---------------------------- | ------ | ------- |
| 09:00-11:00 | Create rollback runbook      | System | Pending |
| 11:00-12:00 | Create testing runbook       | System | Pending |
| 13:00-14:30 | Create deployment runbook    | System | Pending |
| 14:30-16:00 | Create troubleshooting guide | System | Pending |
| 16:00-17:00 | Review runbooks              | System | Pending |

---

### 5.3 Day 3: Final Validation

#### 5.3.1 Tasks

| Time        | Task                   | Owner  | Status  |
| ----------- | ---------------------- | ------ | ------- |
| 09:00-11:00 | Final test suite run   | System | Pending |
| 11:00-12:00 | Final build check      | System | Pending |
| 13:00-14:30 | Final security scan    | System | Pending |
| 14:30-16:00 | Final performance test | System | Pending |
| 16:00-17:00 | Document final results | System | Pending |

---

### 5.4 Day 4: Handoff

#### 5.4.1 Tasks

| Time        | Task                      | Owner  | Status  |
| ----------- | ------------------------- | ------ | ------- |
| 09:00-11:00 | Present changes to team   | System | Pending |
| 11:00-12:00 | Walkthrough documentation | System | Pending |
| 13:00-14:30 | Training session          | System | Pending |
| 14:30-16:00 | Q&A session               | System | Pending |
| 16:00-17:00 | Collect feedback          | System | Pending |

---

### 5.5 Day 5: Closeout

#### 5.5.1 Tasks

| Time        | Task                      | Owner  | Status  |
| ----------- | ------------------------- | ------ | ------- |
| 09:00-11:00 | Address feedback          | System | Pending |
| 11:00-12:00 | Final commit              | System | Pending |
| 13:00-14:30 | Create final report       | System | Pending |
| 14:30-16:00 | Archive project artifacts | System | Pending |
| 16:00-17:00 | Project closeout meeting  | System | Pending |

---

## 6. Ralphy Commands Reference

### 6.1 Analysis Commands

```bash
# Initialize Ralphy
ralphy --init

# Duplicate file analysis
ralphy --opencode "Identify all duplicate files in the codebase"
ralphy --opencode "Compare duplicate file contents"

# Access pattern analysis
ralphy --opencode "Review access patterns in all API routes"
ralphy --opencode "Review access patterns in all middleware"
ralphy --opencode "Review access patterns in all services"
ralphy --opencode "Review access patterns in all hooks"
ralphy --opencode "Review access patterns in all contexts"

# Architecture analysis
ralphy --opencode "Review project architecture for structural issues"
ralphy --opencode "Check for circular dependencies"
ralphy --opencode "Review import paths and resolve all references"
ralphy --opencode "Review directory structure for consistency"
```

### 6.2 Consolidation Commands

```bash
# Utils consolidation
ralphy --opencode "Consolidate duplicate utils files"

# Rate limiter consolidation
ralphy --opencode "Consolidate duplicate rate limiter files"

# Toast hook consolidation
ralphy --opencode "Consolidate duplicate toast hook files"

# Component consolidation
ralphy --opencode "Consolidate component directories"

# Permission data consolidation
ralphy --opencode "Consolidate permission data files"
```

### 6.3 Testing Commands

```bash
# Security testing
ralphy --opencode "Test all API routes for proper authentication"
ralphy --opencode "Test all API routes for proper authorization"
ralphy --opencode "Test middleware for security vulnerabilities"
ralphy --opencode "Test permission enforcement"
ralphy --opencode "Test input validation"

# Performance testing
ralphy --opencode "Test API response times"
ralphy --opencode "Test database query performance"
ralphy --opencode "Test component render performance"
```

---

## 7. Success Criteria

### 7.1 Consolidation Success

- ✅ All duplicate files removed
- ✅ All imports updated correctly
- ✅ All tests passing (100%)
- ✅ No TypeScript errors
- ✅ No ESLint errors
- ✅ Build successful

### 7.2 Access Pattern Success

- ✅ All API routes authenticated
- ✅ All API routes authorized
- ✅ All functions reviewed (100%)
- ✅ All security issues addressed
- ✅ Consistent access patterns

### 7.3 Architecture Success

- ✅ Clear directory structure
- ✅ No circular dependencies
- ✅ Consistent naming
- ✅ Documentation updated
- ✅ Team trained

---

## 8. Risk Management

### 8.1 Risks and Mitigations

| Risk                              | Probability | Impact | Mitigation                     |
| --------------------------------- | ----------- | ------ | ------------------------------ |
| Import errors after consolidation | Medium      | High   | Comprehensive testing          |
| Breaking existing functionality   | Low         | High   | Rollback plan                  |
| Test suite failures               | Medium      | Medium | Fix tests before consolidation |
| Performance regression            | Low         | Medium | Performance testing            |
| Team confusion                    | Low         | Medium | Documentation and training     |

### 8.2 Rollback Plan

```bash
# Rollback to pre-consolidation state
git reset --hard <commit-hash>
npm install
npm run dev
```

---

## 9. Next Steps

1. ✅ Create test plan (test.md) - DONE
2. ✅ Create architecture review (docs/ARCHITECTURE_REVIEW.md) - DONE
3. ✅ Create detailed plan (this document) - DONE
4. ⏳ Get approval for plans
5. ⏳ Execute Phase 1 (Analysis & Assessment)
6. ⏳ Execute Phase 2 (Consolidation)
7. ⏳ Execute Phase 3 (Testing & Validation)
8. ⏳ Execute Phase 4 (Documentation & Handoff)

---

## 10. Appendices

### 10.1 Command Reference

```bash
# Testing
npm test
npm run test:coverage
npx tsc --noEmit
npm run lint
npm run build
npm run dev

# Git
git add -A
git commit -m "message"
git log
git status
git diff

# Ralphy
ralphy --init
ralphy --opencode "task"
ralphy --config

# Analysis
find . -type f \( -name "*.ts" -o -name "*.tsx" \)
grep -r "pattern" --include="*.ts" --include="*.tsx"
npx madge --circular .
```

### 10.2 File Locations

| Category            | Location                      |
| ------------------- | ----------------------------- |
| Test Plan           | `test.md`                     |
| Architecture Review | `docs/ARCHITECTURE_REVIEW.md` |
| PRD                 | `docs/PRD.md`                 |
| Detailed Plan       | `docs/DETAILED_PLAN.md`       |

---

**Document Status**: ✅ Complete
**Next Steps**: Get approval and execute Phase 1
**Review Date**: January 22, 2026
