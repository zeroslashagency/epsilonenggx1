# API Documentation

## API Overview

All APIs are located in `/app/api/` and follow Next.js App Router conventions.

**Base URL:** `http://localhost:3000/api` (development)

---

## Authentication

All API routes require authentication via Supabase JWT token.

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## Admin APIs

### Create User
**POST** `/api/admin/create-user`

**Permission Required:** `manage_users`

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "role": "Operator",
  "password": "StrongP@ss123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "Operator"
  }
}
```

### Delete User
**POST** `/api/admin/delete-user`

**Permission Required:** `manage_users`

**Request Body:**
```json
{
  "userId": "uuid",
  "userEmail": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## Attendance APIs

### Get Attendance
**GET** `/api/attendance`

**Permission Required:** `view_attendance`

**Query Parameters:**
- `fromDate` (required): YYYY-MM-DD
- `toDate` (required): YYYY-MM-DD
- `employeeCode` (optional): Filter by employee

**Response:**
```json
{
  "data": [
    {
      "employee_code": "EMP001",
      "employee_name": "John Doe",
      "log_date": "2025-01-07T09:00:00Z",
      "punch_direction": "in"
    }
  ]
}
```

### Sync Attendance
**POST** `/api/sync-database`

**Permission Required:** `admin`

**Response:**
```json
{
  "success": true,
  "synced": 150,
  "message": "Attendance synced successfully"
}
```

---

## Schedule APIs

### Get Schedules
**GET** `/api/schedules`

**Permission Required:** `view_schedules`

**Response:**
```json
{
  "schedules": [
    {
      "id": "uuid",
      "machine_id": "M001",
      "job_id": "J001",
      "start_time": "2025-01-07T08:00:00Z",
      "end_time": "2025-01-07T16:00:00Z"
    }
  ]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation failed: email is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

**Current:** Not implemented  
**Recommended:** 100 requests per minute per user

---

## Validation

All inputs are validated using Zod schemas.

**Example:**
```typescript
import { validateRequest, createUserSchema } from '@/app/lib/validation/security-schemas'

const validated = await validateRequest(createUserSchema, body)
```

---

## Testing APIs

### Using curl
```bash
curl -X POST http://localhost:3000/api/admin/create-user \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","role":"Operator"}'
```

### Using Postman
1. Set Authorization to Bearer Token
2. Add your JWT token
3. Set Content-Type to application/json
4. Send request

---

## API Best Practices

### ✅ DO:
- Validate all inputs
- Check permissions on backend
- Return appropriate status codes
- Log errors
- Handle edge cases

### ❌ DON'T:
- Trust frontend validation only
- Expose sensitive data
- Return stack traces in production
- Skip error handling
- Hardcode secrets
