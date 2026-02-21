# Error Handling Patterns

> **Custom errors and API error responses** - Consistent error handling across the application.

---

## Custom Error Classes

```typescript
// src/lib/errors.ts

/**
 * Base application error
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Resource not found (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication required (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Access denied (403)
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Resource conflict (409)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit exceeded (429)
 */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 'RATE_LIMITED', 429);
    this.name = 'RateLimitError';
  }
}
```

---

## API Error Handler

```typescript
// src/lib/api-utils.ts

import { NextResponse } from 'next/server';
import { AppError } from './errors';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

/**
 * Central error handler for API routes
 * Converts various error types to consistent API responses
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // Known application errors
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.toJSON() },
      { status: error.statusCode }
    );
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  // Prisma known errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error);
  }

  // Unknown errors - don't leak details in production
  const isDev = process.env.NODE_ENV === 'development';
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        details: isDev ? String(error) : undefined,
      },
    },
    { status: 500 }
  );
}

/**
 * Handle Prisma-specific errors
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): NextResponse {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = (error.meta?.target as string[])?.join(', ') ?? 'field';
      return NextResponse.json(
        {
          error: {
            code: 'CONFLICT',
            message: `A record with this ${field} already exists`,
          },
        },
        { status: 409 }
      );

    case 'P2025':
      // Record not found
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Record not found',
          },
        },
        { status: 404 }
      );

    default:
      return NextResponse.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database operation failed',
          },
        },
        { status: 500 }
      );
  }
}
```

---

## Usage in Services

```typescript
// src/services/user.service.ts

import { NotFoundError, ConflictError, ValidationError } from '@/lib/errors';

export const userService = {
  async findById(id: string): Promise<User> {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError(`User with id ${id} not found`);
    }
    return user;
  },

  async create(input: CreateUserInput): Promise<User> {
    // Check for existing email
    const existing = await db.user.findUnique({ 
      where: { email: input.email } 
    });
    if (existing) {
      throw new ConflictError('Email already in use');
    }

    // Validate input
    const validated = UserCreateSchema.safeParse(input);
    if (!validated.success) {
      throw new ValidationError('Invalid user data', validated.error.flatten());
    }

    return db.user.create({ data: validated.data });
  },
};
```

---

## Usage in API Routes

```typescript
// src/app/api/users/[id]/route.ts

import { userService } from '@/services/user.service';
import { handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await userService.findById(params.id);
    return NextResponse.json({ data: user });
  } catch (error) {
    return handleApiError(error);  // Converts to appropriate HTTP response
  }
}
```

---

## Client-Side Error Handling

```typescript
// src/lib/api/client.ts

import { AppError } from '@/lib/errors';

interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export async function apiClient<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const json: ApiResponse<T> = await response.json();

  if (!response.ok || json.error) {
    throw new AppError(
      json.error?.message ?? 'Request failed',
      json.error?.code ?? 'UNKNOWN_ERROR',
      response.status,
      json.error?.details
    );
  }

  return json.data as T;
}
```

---

## Error Boundary (React)

```tsx
// src/components/ErrorBoundary.tsx

'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Error Logging

```typescript
// src/lib/logger.ts

export function logError(error: unknown, context?: Record<string, unknown>) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
  };

  // In development, just console.error
  console.error('Error:', errorInfo);

  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    // Send to Sentry, LogRocket, etc.
    // Sentry.captureException(error, { extra: context });
  }
}
```

---

## Common Patterns

### Wrapping External Service Errors

```typescript
import { AppError } from '@/lib/errors';

async function fetchExternalData(id: string) {
  try {
    const response = await externalApi.get(id);
    return response.data;
  } catch (error) {
    // Wrap external errors in our error types
    if (error.response?.status === 404) {
      throw new NotFoundError(`External resource ${id} not found`);
    }
    if (error.response?.status === 429) {
      throw new RateLimitError('External API rate limit exceeded');
    }
    throw new AppError(
      'External service unavailable',
      'EXTERNAL_SERVICE_ERROR',
      503
    );
  }
}
```

### Aggregating Multiple Errors

```typescript
// For batch operations
interface BatchResult<T> {
  succeeded: T[];
  failed: Array<{ item: unknown; error: string }>;
}

async function processBatch<T>(
  items: unknown[],
  processor: (item: unknown) => Promise<T>
): Promise<BatchResult<T>> {
  const results = await Promise.allSettled(
    items.map(item => processor(item))
  );

  return {
    succeeded: results
      .filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled')
      .map(r => r.value),
    failed: results
      .map((r, i) => ({ result: r, item: items[i] }))
      .filter((r): r is { result: PromiseRejectedResult; item: unknown } => 
        r.result.status === 'rejected')
      .map(r => ({ item: r.item, error: r.result.reason?.message ?? 'Unknown error' })),
  };
}
```

---

[Back to Backend](./index.md) | [Back to Patterns](../index.md)
