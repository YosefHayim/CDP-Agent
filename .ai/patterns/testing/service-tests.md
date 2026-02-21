# Service Testing Patterns

> **Unit testing services and utilities** - Testing business logic in isolation.

---

## Test Structure

```typescript
// src/services/__tests__/user.service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '../user.service';
import { db } from '@/lib/database';
import { NotFoundError, ValidationError } from '@/lib/errors';

// Mock dependencies
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
  // ============================================
  // SETUP
  // ============================================
  const mockUser = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // findAll
  // ============================================
  describe('findAll', () => {
    it('returns all users', async () => {
      vi.mocked(db.user.findMany).mockResolvedValue([mockUser]);

      const result = await userService.findAll();

      expect(result).toEqual([mockUser]);
      expect(db.user.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('applies filters', async () => {
      vi.mocked(db.user.findMany).mockResolvedValue([]);

      await userService.findAll({ status: 'active' });

      expect(db.user.findMany).toHaveBeenCalledWith({
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ============================================
  // findById
  // ============================================
  describe('findById', () => {
    it('returns user when found', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);

      const result = await userService.findById('1');

      expect(result).toEqual(mockUser);
      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('throws NotFoundError when not found', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);

      await expect(userService.findById('999'))
        .rejects
        .toThrow(NotFoundError);

      await expect(userService.findById('999'))
        .rejects
        .toThrow('User with id 999 not found');
    });
  });

  // ============================================
  // create
  // ============================================
  describe('create', () => {
    const validInput = {
      name: 'New User',
      email: 'new@example.com',
    };

    it('creates and returns new user', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);
      vi.mocked(db.user.create).mockResolvedValue({
        id: '2',
        ...validInput,
        createdAt: new Date(),
      });

      const result = await userService.create(validInput);

      expect(result.email).toBe(validInput.email);
      expect(db.user.create).toHaveBeenCalledWith({
        data: validInput,
      });
    });

    it('throws error for duplicate email', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);

      await expect(userService.create(validInput))
        .rejects
        .toThrow('Email already in use');
    });

    it('validates input', async () => {
      const invalidInput = {
        name: '',
        email: 'not-an-email',
      };

      await expect(userService.create(invalidInput))
        .rejects
        .toThrow(ValidationError);
    });
  });

  // ============================================
  // update
  // ============================================
  describe('update', () => {
    it('updates and returns user', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(db.user.update).mockResolvedValue({
        ...mockUser,
        name: 'Updated Name',
      });

      const result = await userService.update('1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { name: 'Updated Name' },
      });
    });

    it('throws NotFoundError for non-existent user', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);

      await expect(userService.update('999', { name: 'Test' }))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  // ============================================
  // delete
  // ============================================
  describe('delete', () => {
    it('deletes user', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser);
      vi.mocked(db.user.delete).mockResolvedValue(mockUser);

      await userService.delete('1');

      expect(db.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('throws NotFoundError for non-existent user', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null);

      await expect(userService.delete('999'))
        .rejects
        .toThrow(NotFoundError);
    });
  });
});
```

---

## Testing Utilities

```typescript
// src/utils/__tests__/format.test.ts

import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatFullName } from '../format';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('handles negative numbers', () => {
    expect(formatCurrency(-100)).toBe('-$100.00');
  });

  it('rounds correctly', () => {
    expect(formatCurrency(10.999)).toBe('$11.00');
  });
});

describe('formatDate', () => {
  it('formats date string', () => {
    expect(formatDate('2024-01-15')).toBe('January 15, 2024');
  });

  it('formats Date object', () => {
    const date = new Date('2024-01-15T00:00:00Z');
    expect(formatDate(date)).toBe('January 15, 2024');
  });

  it('handles invalid date', () => {
    expect(formatDate('invalid')).toBe('Invalid Date');
  });
});

describe('formatFullName', () => {
  it('combines first and last name', () => {
    expect(formatFullName({ firstName: 'John', lastName: 'Doe' }))
      .toBe('John Doe');
  });

  it('handles missing lastName', () => {
    expect(formatFullName({ firstName: 'John', lastName: '' }))
      .toBe('John');
  });

  it('trims whitespace', () => {
    expect(formatFullName({ firstName: ' John ', lastName: ' Doe ' }))
      .toBe('John Doe');
  });
});
```

---

## Testing Async Code

```typescript
describe('asyncFunction', () => {
  it('resolves with data', async () => {
    const result = await asyncFunction();
    expect(result).toEqual({ success: true });
  });

  it('rejects with error', async () => {
    await expect(asyncFunctionThatFails())
      .rejects
      .toThrow('Expected error');
  });

  // For promises
  it('returns expected value', () => {
    return expect(asyncFunction()).resolves.toEqual({ success: true });
  });

  it('rejects with error', () => {
    return expect(asyncFunctionThatFails()).rejects.toThrow();
  });
});
```

---

## Testing Error Handling

```typescript
describe('error handling', () => {
  it('throws specific error type', async () => {
    await expect(service.findById('invalid'))
      .rejects
      .toBeInstanceOf(NotFoundError);
  });

  it('includes error details', async () => {
    try {
      await service.findById('invalid');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundError);
      expect((error as NotFoundError).code).toBe('NOT_FOUND');
      expect((error as NotFoundError).statusCode).toBe(404);
    }
  });

  it('catches and wraps external errors', async () => {
    vi.mocked(externalApi.call).mockRejectedValue(new Error('Network error'));

    await expect(service.callExternal())
      .rejects
      .toThrow('External service unavailable');
  });
});
```

---

## Mocking Patterns

### Mocking Modules

```typescript
// Mock entire module
vi.mock('@/lib/database');

// Mock specific exports
vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual('@/lib/utils');
  return {
    ...actual,
    generateId: vi.fn(() => 'mock-id'),
  };
});
```

### Mocking External APIs

```typescript
vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    paymentIntents: {
      create: vi.fn(),
      retrieve: vi.fn(),
    },
  })),
}));

describe('paymentService', () => {
  it('creates payment intent', async () => {
    const mockIntent = { id: 'pi_123', status: 'requires_payment_method' };
    vi.mocked(stripe.paymentIntents.create).mockResolvedValue(mockIntent);

    const result = await paymentService.createPaymentIntent(1000, 'usd');

    expect(result.id).toBe('pi_123');
  });
});
```

### Spying on Functions

```typescript
import * as utils from '@/lib/utils';

describe('with spies', () => {
  it('tracks calls to real function', () => {
    const spy = vi.spyOn(utils, 'generateId');

    service.createEntity({ name: 'Test' });

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
```

---

## Test Data Factories

```typescript
// src/test/factories.ts

export function createUser(overrides?: Partial<User>): User {
  return {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createOrder(overrides?: Partial<Order>): Order {
  return {
    id: '1',
    userId: '1',
    status: 'pending',
    total: 100,
    items: [],
    createdAt: new Date(),
    ...overrides,
  };
}

// Usage
describe('orderService', () => {
  it('calculates order total', () => {
    const order = createOrder({
      items: [
        { productId: '1', quantity: 2, price: 50 },
        { productId: '2', quantity: 1, price: 30 },
      ],
    });

    expect(orderService.calculateTotal(order)).toBe(130);
  });
});
```

---

## Anti-Patterns

### DON'T: Test Private Methods

```typescript
// BAD: Testing internal helper
it('validates email format', () => {
  expect(service._validateEmail('test@example.com')).toBe(true);
});

// GOOD: Test through public interface
it('rejects invalid email', async () => {
  await expect(service.create({ email: 'invalid' }))
    .rejects
    .toThrow('Invalid email');
});
```

### DON'T: Mock Everything

```typescript
// BAD: Over-mocking
vi.mock('@/lib/utils');
vi.mock('@/lib/validation');
vi.mock('@/lib/database');
vi.mock('zod');

// GOOD: Mock external dependencies, use real utilities
vi.mock('@/lib/database');  // External I/O
// Let utils, validation run with real code
```

### DON'T: Share State Between Tests

```typescript
// BAD: Shared mutable state
let counter = 0;

it('test 1', () => { counter++; });
it('test 2', () => { expect(counter).toBe(1); });  // Depends on test 1!

// GOOD: Reset in beforeEach
beforeEach(() => {
  counter = 0;
});
```

---

[Back to Testing](./index.md) | [Back to Patterns](../index.md)
