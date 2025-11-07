# Setup Guide

## Quick Start

### 1. Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Git

### 2. Installation

```bash
# Clone repository
git clone <your-repo-url>
cd epsilonschedulingmain

# Install dependencies
npm install
```

### 3. Environment Setup

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Security
NEXT_PUBLIC_APP_URL=http://localhost:3000
ALLOWED_ORIGIN=http://localhost:3000

# SmartOffice Integration (Optional)
SMARTOFFICE_API_URL=your_smartoffice_url
SMARTOFFICE_API_KEY=your_api_key
```

### 4. Database Setup

Run migrations in Supabase:

```bash
# Migrations are in supabase/migrations/
# Apply them in order through Supabase Dashboard or CLI
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Run Tests

```bash
# Watch mode
npm test

# Run once with coverage
npm run test:coverage
```

### 7. Build for Production

```bash
npm run build
npm start
```

---

## GitHub Actions Setup

### Add Secrets

Go to: Repository → Settings → Secrets and variables → Actions

Add:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

---

## Deployment

### Vercel (Recommended)

1. Connect GitHub repository
2. Add environment variables
3. Deploy

### Manual Deployment

```bash
npm run build
npm start
```

---

## Troubleshooting

### Build Errors
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Test Errors
```bash
# Clear Jest cache
npx jest --clearCache
npm test
```

### Type Errors
```bash
# Check types
npm run type-check
```

---

## Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md)
- Read [SECURITY.md](./SECURITY.md)
- Read [TESTING.md](./TESTING.md)
