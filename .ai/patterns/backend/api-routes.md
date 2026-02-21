# API Route Patterns

> **REST API structure and request handling** - Next.js App Router patterns.

---

## Route Structure

```
src/app/api/
├── users/
│   ├── route.ts              # GET (list), POST (create)
│   └── [id]/
│       └── route.ts          # GET, PUT, DELETE (single)
├── orders/
│   ├── route.ts              # GET, POST
│   ├── [id]/
│   │   └── route.ts          # GET, PUT, DELETE
│   └── [id]/items/
│       └── route.ts          # GET, POST (nested resource)
├── auth/
│   ├── login/route.ts        # POST
│   ├── logout/route.ts       # POST
│   └── me/route.ts           # GET (current user)
```

---

## Standard Route Handler

### Collection Route (list + create)

```typescript
// src/app/api/users/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/services/user.service';
import { handleApiError } from '@/lib/api-utils';
import { auth } from '@/lib/auth';

/**
 * GET /api/users - List all users
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse query params
    const { searchParams } = new URL(request.url);
    const filters = {
      status: searchParams.get('status') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    };

    // 3. Call service
    const data = await userService.findAll(filters);

    // 4. Return response
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/users - Create new user
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse body
    const body = await request.json();

    // 3. Call service (service handles validation)
    const data = await userService.create(body);

    // 4. Return response with 201 status
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Item Route (get, update, delete)

```typescript
// src/app/api/users/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/services/user.service';
import { handleApiError } from '@/lib/api-utils';
import { auth } from '@/lib/auth';

type Params = { params: { id: string } };

/**
 * GET /api/users/:id - Get single user
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await userService.findById(params.id);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/users/:id - Update user
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = await userService.update(params.id, body);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/users/:id - Delete user
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await userService.delete(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## Response Format

### Success Response

```typescript
// Single item
{
  "data": {
    "id": "123",
    "name": "John",
    "email": "john@example.com"
  }
}

// Collection
{
  "data": [
    { "id": "1", "name": "John" },
    { "id": "2", "name": "Jane" }
  ]
}

// Paginated collection
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### Error Response

```typescript
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User with id 123 not found",
    "details": null
  }
}

// Validation error
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "fieldErrors": {
        "email": ["Invalid email format"],
        "name": ["Required"]
      }
    }
  }
}
```

---

## HTTP Status Codes

| Status | When to Use |
|--------|-------------|
| `200` | GET success, PUT success |
| `201` | POST success (created) |
| `204` | DELETE success (no content) |
| `400` | Validation error, bad request |
| `401` | Not authenticated |
| `403` | Authenticated but not authorized |
| `404` | Resource not found |
| `409` | Conflict (e.g., duplicate email) |
| `500` | Server error |

---

## Pagination

```typescript
// src/app/api/users/route.ts

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20');
    
    const { data, total } = await userService.findAllPaginated({
      page,
      pageSize,
    });
    
    return NextResponse.json({
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## File Uploads

```typescript
// src/app/api/upload/route.ts

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: { code: 'NO_FILE', message: 'No file provided' } },
        { status: 400 }
      );
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: { code: 'INVALID_TYPE', message: 'Invalid file type' } },
        { status: 400 }
      );
    }
    
    const url = await uploadService.upload(file);
    return NextResponse.json({ data: { url } }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## Middleware-like Patterns

### Authentication Wrapper

```typescript
// src/lib/api-utils.ts

export function withAuth<T>(
  handler: (request: NextRequest, session: Session, context: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: T) => {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(request, session, context);
  };
}

// Usage
export const GET = withAuth(async (request, session, { params }) => {
  const data = await userService.findById(params.id);
  return NextResponse.json({ data });
});
```

### Rate Limiting

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function POST(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }
  
  // Handle request...
}
```

---

## Anti-Patterns

### DON'T: Forget Error Handling

```typescript
// BAD: Unhandled errors crash the server
export async function GET() {
  const data = await userService.findAll();  // What if this throws?
  return NextResponse.json({ data });
}

// GOOD: Wrap in try-catch
export async function GET() {
  try {
    const data = await userService.findAll();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### DON'T: Put Business Logic in Routes

```typescript
// BAD: Route does too much
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // All this should be in a service!
  if (!body.email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
  const existing = await db.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return NextResponse.json({ error: 'Email exists' }, { status: 409 });
  }
  const user = await db.user.create({ data: body });
  // ...
}

// GOOD: Delegate to service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await userService.create(body);  // Service handles everything
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    return handleApiError(error);  // Error handler maps to HTTP status
  }
}
```

---

[Back to Backend](./index.md) | [Back to Patterns](../index.md)
