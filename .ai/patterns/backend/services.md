# Service Layer Pattern

> **Business logic organization** - Keep API routes thin, services fat.

---

## Service Structure

```
src/services/
├── index.ts              # Re-export all services
├── user.service.ts       # User-related operations
├── auth.service.ts       # Authentication operations
├── order.service.ts      # Order operations
└── types.ts              # Shared service types
```

---

## Standard Service Pattern

```typescript
// src/services/user.service.ts

import { db } from '@/lib/database';
import { UserCreateSchema, UserUpdateSchema } from '@/schemas';
import { NotFoundError, ValidationError } from '@/lib/errors';
import type { User, CreateUserInput, UpdateUserInput, UserFilters } from '@/types';

export const userService = {
  /**
   * Find all users with optional filtering
   */
  async findAll(filters?: UserFilters): Promise<User[]> {
    return db.user.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Find single user by ID
   * @throws NotFoundError if not found
   */
  async findById(id: string): Promise<User> {
    const result = await db.user.findUnique({ where: { id } });
    if (!result) {
      throw new NotFoundError(`User with id ${id} not found`);
    }
    return result;
  },

  /**
   * Find user by email
   * @returns User or null
   */
  async findByEmail(email: string): Promise<User | null> {
    return db.user.findUnique({ where: { email } });
  },

  /**
   * Create new user
   * @throws ValidationError if input invalid
   */
  async create(input: CreateUserInput): Promise<User> {
    const validated = UserCreateSchema.parse(input);
    
    // Check for existing email
    const existing = await this.findByEmail(validated.email);
    if (existing) {
      throw new ValidationError('Email already in use');
    }
    
    return db.user.create({ data: validated });
  },

  /**
   * Update existing user
   * @throws NotFoundError if not found
   * @throws ValidationError if input invalid
   */
  async update(id: string, input: UpdateUserInput): Promise<User> {
    await this.findById(id); // Ensure exists
    const validated = UserUpdateSchema.parse(input);
    return db.user.update({ where: { id }, data: validated });
  },

  /**
   * Delete user
   * @throws NotFoundError if not found
   */
  async delete(id: string): Promise<void> {
    await this.findById(id); // Ensure exists
    await db.user.delete({ where: { id } });
  },
};
```

---

## Service Method Guidelines

### Method Naming

| Action | Method Name | Returns |
|--------|-------------|---------|
| Get all | `findAll(filters?)` | `Entity[]` |
| Get one | `findById(id)` | `Entity` (throws if not found) |
| Get one (nullable) | `findByX(x)` | `Entity \| null` |
| Create | `create(input)` | `Entity` |
| Update | `update(id, input)` | `Entity` |
| Delete | `delete(id)` | `void` |

### Error Handling

```typescript
// Throw domain errors, let API layer handle HTTP status
async findById(id: string): Promise<User> {
  const result = await db.user.findUnique({ where: { id } });
  if (!result) {
    throw new NotFoundError(`User ${id} not found`);  // Domain error
  }
  return result;
}

// Validate input at service layer
async create(input: CreateUserInput): Promise<User> {
  const validated = UserCreateSchema.parse(input);  // Throws ZodError if invalid
  // ...
}
```

### Complex Operations

```typescript
// For operations involving multiple entities, use transactions
async createOrderWithItems(
  orderInput: CreateOrderInput,
  items: CreateOrderItemInput[]
): Promise<Order> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.create({ data: orderInput });
    
    await tx.orderItem.createMany({
      data: items.map(item => ({ ...item, orderId: order.id })),
    });
    
    return order;
  });
}
```

---

## Service Dependencies

### Injecting Other Services

```typescript
// Option 1: Direct import (simple)
import { emailService } from './email.service';

export const userService = {
  async create(input: CreateUserInput) {
    const user = await db.user.create({ data: input });
    await emailService.sendWelcome(user.email);
    return user;
  },
};

// Option 2: Dependency injection (testable)
export function createUserService(deps: { emailService: EmailService }) {
  return {
    async create(input: CreateUserInput) {
      const user = await db.user.create({ data: input });
      await deps.emailService.sendWelcome(user.email);
      return user;
    },
  };
}
```

### External API Integration

```typescript
// src/services/payment.service.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const paymentService = {
  async createPaymentIntent(amount: number, currency: string) {
    return stripe.paymentIntents.create({
      amount,
      currency,
    });
  },
  
  async getPayment(paymentIntentId: string) {
    return stripe.paymentIntents.retrieve(paymentIntentId);
  },
};
```

---

## Testing Services

```typescript
// src/services/__tests__/user.service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '../user.service';
import { db } from '@/lib/database';
import { NotFoundError } from '@/lib/errors';

// Mock database
vi.mock('@/lib/database', () => ({
  db: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      const mockUser = { id: '1', name: 'Test', email: 'test@example.com' };
      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);

      const result = await userService.findById('1');

      expect(result).toEqual(mockUser);
      expect(db.user.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
    });

    it('throws NotFoundError when not found', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);

      await expect(userService.findById('999'))
        .rejects
        .toThrow(NotFoundError);
    });
  });
});
```

---

## Anti-Patterns

### DON'T: Put Business Logic in API Routes

```typescript
// BAD: Logic in route handler
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Business logic should NOT be here
  const validated = UserSchema.parse(body);
  const existing = await db.user.findUnique({ where: { email: validated.email } });
  if (existing) throw new Error('Email exists');
  const user = await db.user.create({ data: validated });
  // ...
}

// GOOD: Delegate to service
export async function POST(request: NextRequest) {
  const body = await request.json();
  const user = await userService.create(body);  // Service handles everything
  return NextResponse.json({ data: user }, { status: 201 });
}
```

### DON'T: Return HTTP Status from Services

```typescript
// BAD: Service knows about HTTP
async findById(id: string) {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) {
    return { status: 404, error: 'Not found' };  // HTTP concern!
  }
  return { status: 200, data: user };
}

// GOOD: Throw domain errors
async findById(id: string) {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError(`User ${id} not found`);  // Domain error
  }
  return user;
}
```

---

[Back to Backend](./index.md) | [Back to Patterns](../index.md)
