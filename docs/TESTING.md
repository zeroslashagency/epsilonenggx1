# Testing Documentation

## Testing Overview

**Total Tests:** 35  
**Passing:** 30 (86%)  
**Coverage Target:** 50% → 80%

---

## Test Structure

```
epsilonschedulingmain/
├── app/
│   └── lib/
│       └── validation/
│           └── __tests__/
│               └── security-schemas.test.ts    # 25 tests
├── components/
│   └── __tests__/
│       └── AttendanceTodayChart.test.tsx       # 4 tests
└── app/api/
    └── admin/
        └── delete-user/
            └── __tests__/
                └── route.test.ts                # 6 tests
```

---

## Running Tests

### Watch Mode (Development)
```bash
npm test
```

### Run Once
```bash
npm run test:ci
```

### With Coverage
```bash
npm run test:coverage
```

### Specific Test File
```bash
npm test security-schemas
```

---

## Test Categories

### 1. Security Validation Tests (25 tests)

**File:** `app/lib/validation/__tests__/security-schemas.test.ts`

**Coverage:**
- ✅ Email validation
- ✅ Password strength
- ✅ Name validation
- ✅ UUID validation
- ✅ Role validation
- ✅ XSS sanitization
- ✅ Object sanitization
- ✅ Request validation

**Example:**
```typescript
describe('emailSchema', () => {
  it('should accept valid email', () => {
    const result = emailSchema.safeParse('test@example.com')
    expect(result.success).toBe(true)
  })

  it('should reject invalid email', () => {
    const result = emailSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})
```

### 2. Component Tests (4 tests)

**File:** `components/__tests__/AttendanceTodayChart.test.tsx`

**Coverage:**
- ✅ Component rendering
- ✅ Props handling
- ✅ Empty data handling
- ✅ React.memo optimization

**Example:**
```typescript
describe('AttendanceTodayChart', () => {
  it('should render without crashing', () => {
    const { container } = render(<AttendanceTodayChart data={mockData} />)
    expect(container).toBeInTheDocument()
  })
})
```

### 3. API Route Tests (6 tests)

**File:** `app/api/admin/delete-user/__tests__/route.test.ts`

**Coverage:**
- ✅ Success cases
- ✅ Error handling
- ✅ Input validation
- ✅ Authentication
- ✅ Authorization

**Example:**
```typescript
describe('DELETE /api/admin/delete-user', () => {
  it('should delete user successfully', async () => {
    const response = await POST(request)
    expect(response.status).toBe(200)
  })
})
```

---

## Test Configuration

### jest.config.js
```javascript
{
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
}
```

### jest.setup.js
```javascript
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({ ... }))

// Mock Supabase client
jest.mock('@/app/lib/services/supabase-client', () => ({ ... }))

// Mock ResizeObserver (for Recharts)
global.ResizeObserver = jest.fn().mockImplementation(() => ({ ... }))
```

---

## Writing Tests

### Best Practices

#### ✅ DO:
```typescript
// Test user behavior, not implementation
it('should show error message when email is invalid', () => {
  // Test what the user sees
})

// Test edge cases
it('should handle empty data gracefully', () => {
  render(<Component data={[]} />)
})

// Use descriptive test names
it('should reject password without uppercase letter', () => {
  // Clear what's being tested
})
```

#### ❌ DON'T:
```typescript
// Don't test implementation details
it('should call useState hook', () => {
  // Too implementation-specific
})

// Don't skip error cases
it('should work with valid data', () => {
  // Also test invalid data!
})

// Don't use vague names
it('should work', () => {
  // What should work?
})
```

### Test Template

```typescript
import { render, screen } from '@testing-library/react'
import { MyComponent } from '../MyComponent'

describe('MyComponent', () => {
  // Setup
  const mockData = { /* ... */ }

  it('should render successfully', () => {
    render(<MyComponent data={mockData} />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('should handle empty data', () => {
    render(<MyComponent data={[]} />)
    // Assert expected behavior
  })

  it('should handle errors', () => {
    // Test error scenarios
  })
})
```

---

## Coverage Reports

### Generate Report
```bash
npm run test:coverage
```

### View Report
```bash
open coverage/lcov-report/index.html
```

### Current Coverage
```
File                          | % Stmts | % Branch | % Funcs | % Lines
------------------------------|---------|----------|---------|--------
security-schemas.ts           |   95.2  |   88.9   |  100.0  |  94.7
AttendanceTodayChart.tsx      |   87.5  |   75.0   |   80.0  |  87.5
delete-user/route.ts          |   78.3  |   66.7   |   75.0  |  78.3
```

---

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Every push to main/develop
- Every pull request

**Workflow:** `.github/workflows/ci.yml`

```yaml
- name: Run tests
  run: npm run test:ci

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

---

## Troubleshooting

### Tests Not Running
```bash
# Clear Jest cache
npx jest --clearCache

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Import Errors
Check `jest.config.js` path aliases:
```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
}
```

### Timeout Errors
Increase timeout in test:
```typescript
it('should complete async operation', async () => {
  // ...
}, 10000) // 10 second timeout
```

---

## Next Steps

### This Week
1. Add more component tests
2. Add more API tests
3. Reach 50% coverage

### Next Month
4. Add integration tests
5. Add E2E tests (Cypress/Playwright)
6. Reach 80% coverage
7. Add visual regression tests

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
