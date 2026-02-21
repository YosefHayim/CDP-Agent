# Patterns

> **Specific implementation patterns** for this project. Follow these when writing code.

---

## Overview

Patterns are concrete implementation guides. Unlike standards (which are universal principles), patterns are specific to technologies and project conventions.

## Pattern Domains

| Domain | Contents | Entry Point |
|--------|----------|-------------|
| **Frontend** | Components, styling, data fetching | [frontend/](./frontend/index.md) |
| **Backend** | Services, API routes, error handling | [backend/](./backend/index.md) |
| **Testing** | Component tests, service tests | [testing/](./testing/index.md) |

---

## How to Use Patterns

### Before Implementing

1. Check if a pattern exists for your use case
2. Follow the pattern exactly (or document why you deviated)
3. Look at existing code that follows the pattern

### When to Create New Patterns

Document a new pattern when:
- Same implementation approach used 3+ times
- Code reviews repeatedly suggest same structure
- Bug could have been prevented by consistent approach

### Pattern Quality Checklist

Good patterns include:
- [ ] Clear purpose statement
- [ ] DO examples (correct implementation)
- [ ] DON'T examples (anti-patterns)
- [ ] File structure conventions
- [ ] Real code examples from the project

---

## Quick Reference

### Frontend

```typescript
// Component structure
src/components/ComponentName/
├── index.ts
├── ComponentName.tsx
├── ComponentName.test.tsx
└── types.ts

// Hook naming
useEntityName() // e.g., useUser, useProducts

// Query keys
const entityKeys = {
  all: ['entities'],
  detail: (id) => ['entities', 'detail', id],
}
```

### Backend

```typescript
// Service structure
src/services/
├── entity.service.ts    // Business logic
├── entity.repository.ts // Data access (optional)
└── types.ts

// API route structure
src/app/api/entity/
├── route.ts        // GET, POST for collection
└── [id]/route.ts   // GET, PUT, DELETE for item
```

### Testing

```typescript
// Test file naming
ComponentName.test.tsx  // Unit tests
ComponentName.e2e.ts    // E2E tests

// Test structure
describe('ComponentName', () => {
  describe('rendering', () => { ... });
  describe('interactions', () => { ... });
  describe('edge cases', () => { ... });
});
```

---

[Back to Index](../index.md)
