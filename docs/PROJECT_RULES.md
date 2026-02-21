# Project-Specific Rules & Patterns

> **Purpose**: This file contains YOUR project's specific patterns, conventions, and technology choices.
> AI agents will reference this file before implementing any feature.
>
> **Instructions**: Replace all `{{PLACEHOLDER}}` values with your project's actual choices.
> Delete sections that don't apply to your stack.

---

## Technology Stack

<!-- UPDATE THESE VALUES for your project -->

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| **Frontend Framework** | {{FRONTEND_FRAMEWORK}} | {{VERSION}} | e.g., React 18, Vue 3, Svelte 5 |
| **Styling** | {{STYLING_SOLUTION}} | {{VERSION}} | e.g., TailwindCSS, CSS Modules |
| **State Management** | {{STATE_MANAGEMENT}} | {{VERSION}} | e.g., Zustand, Redux Toolkit |
| **Backend Framework** | {{BACKEND_FRAMEWORK}} | {{VERSION}} | e.g., Next.js, Express, Fastify |
| **Database** | {{DATABASE}} | {{VERSION}} | e.g., PostgreSQL, MongoDB |
| **ORM** | {{ORM}} | {{VERSION}} | e.g., Prisma, Drizzle, TypeORM |
| **Testing** | {{TEST_FRAMEWORK}} | {{VERSION}} | e.g., Vitest, Jest, Playwright |
| **Package Manager** | {{PACKAGE_MANAGER}} | {{VERSION}} | e.g., pnpm, npm, bun |

---

## Frontend Patterns

### Component Structure

<!-- Choose your pattern and customize -->

```tsx
// {{PROJECT_NAME}} Standard Component Pattern

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { {{ComponentName}}Props } from './types';

/**
 * @description Brief description of component purpose
 * @example
 * <{{ComponentName}} prop="value" />
 */
export function {{ComponentName}}({ 
  className,
  children,
  ...props 
}: {{ComponentName}}Props) {
  // 1. Hooks first (state, refs, custom hooks)
  const [state, setState] = useState(initialValue);
  
  // 2. Effects second
  useEffect(() => {
    // Side effects here
  }, [dependencies]);
  
  // 3. Event handlers third
  const handleAction = () => {
    // Handler logic
  };
  
  // 4. Render last
  return (
    <div className={cn('base-styles', className)} {...props}>
      {children}
    </div>
  );
}
```

### Component File Structure

```
src/components/
├── {{ComponentName}}/
│   ├── index.ts              # Re-export
│   ├── {{ComponentName}}.tsx # Main component
│   ├── {{ComponentName}}.test.tsx # Tests
│   ├── types.ts              # TypeScript types
│   └── utils.ts              # Component-specific utils (if needed)
```

### Styling Conventions

<!-- If using TailwindCSS -->

```tsx
// DO: Use consistent spacing scale
<div className="p-4 m-2 gap-4">  // 4 = 1rem = 16px

// DO: Use design system colors
<button className="bg-primary text-primary-foreground hover:bg-primary/90">

// DO: Extract repeated patterns to variables
const cardStyles = "rounded-lg border bg-card p-6 shadow-sm";
const buttonBase = "inline-flex items-center justify-center rounded-md text-sm font-medium";

// DON'T: Use arbitrary values without documented reason
<div className="p-[13px]">  // Why 13px specifically?

// DON'T: Mix styling approaches
<div className="p-4" style={{ margin: '8px' }}>  // Pick one approach
```

<!-- If using CSS Modules -->

```tsx
// DO: Use semantic class names
import styles from './Button.module.css';
<button className={styles.primary}>

// DON'T: Use presentational names
<button className={styles.blueButton}>  // What if design changes?
```

---

## Backend Patterns

### Service Layer Pattern

```typescript
// {{PROJECT_NAME}} Service Pattern
// Location: src/services/{{domain}}.service.ts

import { db } from '@/lib/database';
import { {{Entity}}CreateSchema, {{Entity}}UpdateSchema } from '@/schemas';
import { NotFoundError, ValidationError } from '@/lib/errors';
import type { {{Entity}}, Create{{Entity}}Input, Update{{Entity}}Input } from '@/types';

export const {{domain}}Service = {
  /**
   * Find all {{entities}} with optional filtering
   */
  async findAll(filters?: {{Entity}}Filters): Promise<{{Entity}}[]> {
    return db.{{entity}}.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Find single {{entity}} by ID
   * @throws NotFoundError if not found
   */
  async findById(id: string): Promise<{{Entity}}> {
    const result = await db.{{entity}}.findUnique({ where: { id } });
    if (!result) {
      throw new NotFoundError(`{{Entity}} with id ${id} not found`);
    }
    return result;
  },

  /**
   * Create new {{entity}}
   * @throws ValidationError if input invalid
   */
  async create(input: Create{{Entity}}Input): Promise<{{Entity}}> {
    const validated = {{Entity}}CreateSchema.parse(input);
    return db.{{entity}}.create({ data: validated });
  },

  /**
   * Update existing {{entity}}
   * @throws NotFoundError if not found
   * @throws ValidationError if input invalid
   */
  async update(id: string, input: Update{{Entity}}Input): Promise<{{Entity}}> {
    await this.findById(id); // Ensure exists
    const validated = {{Entity}}UpdateSchema.parse(input);
    return db.{{entity}}.update({ where: { id }, data: validated });
  },

  /**
   * Delete {{entity}}
   * @throws NotFoundError if not found
   */
  async delete(id: string): Promise<void> {
    await this.findById(id); // Ensure exists
    await db.{{entity}}.delete({ where: { id } });
  },
};
```

### API Route Pattern

<!-- For Next.js App Router -->

```typescript
// Location: src/app/api/{{domain}}/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { {{domain}}Service } from '@/services/{{domain}}.service';
import { handleApiError } from '@/lib/api-utils';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication (if required)
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse query params
    const { searchParams } = new URL(request.url);
    const filters = Object.fromEntries(searchParams);

    // 3. Call service
    const data = await {{domain}}Service.findAll(filters);

    // 4. Return response
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = await {{domain}}Service.create(body);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## Error Handling

### Custom Error Classes

```typescript
// Location: src/lib/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}
```

### API Error Handler

```typescript
// Location: src/lib/api-utils.ts

import { NextResponse } from 'next/server';
import { AppError } from './errors';
import { ZodError } from 'zod';

export function handleApiError(error: unknown) {
  console.error('API Error:', error);

  // Known application errors
  if (error instanceof AppError) {
    return NextResponse.json(
      { 
        error: { 
          code: error.code, 
          message: error.message,
          details: error.details 
        } 
      },
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
          details: error.flatten() 
        } 
      },
      { status: 400 }
    );
  }

  // Unknown errors - don't leak details
  return NextResponse.json(
    { 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: 'An unexpected error occurred' 
      } 
    },
    { status: 500 }
  );
}
```

---

## Data Fetching Patterns

### React Query / TanStack Query

```typescript
// Location: src/hooks/use-{{entity}}.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { {{domain}}Api } from '@/lib/api/{{domain}}';
import type { {{Entity}}, Create{{Entity}}Input } from '@/types';

// Query keys - centralized for consistency
export const {{entity}}Keys = {
  all: ['{{entities}}'] as const,
  lists: () => [...{{entity}}Keys.all, 'list'] as const,
  list: (filters: string) => [...{{entity}}Keys.lists(), filters] as const,
  details: () => [...{{entity}}Keys.all, 'detail'] as const,
  detail: (id: string) => [...{{entity}}Keys.details(), id] as const,
};

// Fetch all
export function use{{Entities}}(filters?: {{Entity}}Filters) {
  return useQuery({
    queryKey: {{entity}}Keys.list(JSON.stringify(filters)),
    queryFn: () => {{domain}}Api.getAll(filters),
  });
}

// Fetch single
export function use{{Entity}}(id: string) {
  return useQuery({
    queryKey: {{entity}}Keys.detail(id),
    queryFn: () => {{domain}}Api.getById(id),
    enabled: !!id,
  });
}

// Create mutation
export function useCreate{{Entity}}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Create{{Entity}}Input) => {{domain}}Api.create(input),
    onSuccess: () => {
      // IMPORTANT: Always invalidate relevant queries after mutations
      queryClient.invalidateQueries({ queryKey: {{entity}}Keys.lists() });
    },
  });
}

// Update mutation
export function useUpdate{{Entity}}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Update{{Entity}}Input }) => 
      {{domain}}Api.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: {{entity}}Keys.detail(id) });
      queryClient.invalidateQueries({ queryKey: {{entity}}Keys.lists() });
    },
  });
}

// Delete mutation
export function useDelete{{Entity}}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {{domain}}Api.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {{entity}}Keys.lists() });
    },
  });
}
```

---

## Testing Patterns

### Component Testing

```typescript
// Location: src/components/{{ComponentName}}/{{ComponentName}}.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { {{ComponentName}} } from './{{ComponentName}}';

describe('{{ComponentName}}', () => {
  // Setup
  const defaultProps = {
    // Add default props here
  };

  const renderComponent = (props = {}) => {
    return render(<{{ComponentName}} {...defaultProps} {...props} />);
  };

  // Rendering tests
  it('renders correctly with default props', () => {
    renderComponent();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  // Interaction tests
  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    renderComponent({ onClick: handleClick });
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // State tests
  it('shows loading state when isLoading is true', () => {
    renderComponent({ isLoading: true });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  // Edge cases
  it('handles empty data gracefully', () => {
    renderComponent({ data: [] });
    expect(screen.getByText(/no items/i)).toBeInTheDocument();
  });
});
```

### Service Testing

```typescript
// Location: src/services/__tests__/{{domain}}.service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { {{domain}}Service } from '../{{domain}}.service';
import { db } from '@/lib/database';
import { NotFoundError } from '@/lib/errors';

// Mock database
vi.mock('@/lib/database', () => ({
  db: {
    {{entity}}: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('{{domain}}Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('returns {{entity}} when found', async () => {
      const mock{{Entity}} = { id: '1', name: 'Test' };
      vi.mocked(db.{{entity}}.findUnique).mockResolvedValue(mock{{Entity}});

      const result = await {{domain}}Service.findById('1');

      expect(result).toEqual(mock{{Entity}});
      expect(db.{{entity}}.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('throws NotFoundError when not found', async () => {
      vi.mocked(db.{{entity}}.findUnique).mockResolvedValue(null);

      await expect({{domain}}Service.findById('999'))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('creates and returns new {{entity}}', async () => {
      const input = { name: 'New {{Entity}}' };
      const created = { id: '1', ...input };
      vi.mocked(db.{{entity}}.create).mockResolvedValue(created);

      const result = await {{domain}}Service.create(input);

      expect(result).toEqual(created);
      expect(db.{{entity}}.create).toHaveBeenCalledWith({ data: input });
    });
  });
});
```

---

## Git Conventions

### Commit Message Format

```
<type>(<scope>): <description> (#task-id)

[optional body]

[optional footer]
```

### Commit Types

| Type | When to Use |
|------|-------------|
| `feat` | New feature for users |
| `fix` | Bug fix for users |
| `docs` | Documentation only changes |
| `style` | Formatting, missing semicolons, etc. |
| `refactor` | Code change that neither fixes bug nor adds feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks, dependency updates |

### Examples

```bash
# Feature
feat(auth): add OAuth2 login with Google (#1.2)

# Bug fix
fix(api): handle null response in user service (#2.1)

# Refactor
refactor(components): extract Card base component (#3.4)

Extracted common card styling into reusable Card component.
Updated UserCard and ProductCard to use new base.

BREAKING CHANGE: Card now requires 'variant' prop
```

### Branch Naming

```
<type>/<task-id>-<short-description>

Examples:
feat/1.2-oauth-login
fix/2.1-null-response
refactor/3.4-card-component
```

---

## Project-Specific Patterns

<!-- 
  ADD YOUR OWN PATTERNS HERE
  
  As you discover patterns in your codebase:
  1. Document them here
  2. Include DO and DON'T examples
  3. Reference actual files in your codebase
-->

### Example: Form Handling

```typescript
// DO: Use controlled forms with validation
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: { name: '', email: '' },
});

// DON'T: Mix controlled and uncontrolled inputs
<input ref={inputRef} value={value} onChange={handleChange} />
```

### Example: Authentication Checks

```typescript
// DO: Check auth at route/page level
export default async function ProtectedPage() {
  const session = await auth();
  if (!session) redirect('/login');
  // ...
}

// DON'T: Check auth in individual components
function UserProfile() {
  const session = useSession();
  if (!session) return null; // This causes layout shift
  // ...
}
```

---

## Discovered Patterns Log

<!-- 
  AI agents will add patterns they discover here.
  Review and promote important ones to sections above.
-->

### {{DATE}} - {{PATTERN_NAME}}

**Context**: {{Where this pattern was discovered}}

**Pattern**:
```typescript
// Example code
```

**Why**: {{Explanation of why this pattern is important}}

---

*Last updated: {{DATE}}*
*Maintained by: AI agents + human review*
