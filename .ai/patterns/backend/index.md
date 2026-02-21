# Backend Patterns

> **Server-side implementation patterns** - Services, API routes, error handling.

---

## Documents

| Document | Contents |
|----------|----------|
| [Services](./services.md) | Service layer pattern, business logic |
| [API Routes](./api-routes.md) | REST API structure, request handling |
| [Error Handling](./error-handling.md) | Custom errors, API error responses |

---

## Quick Reference

### Service Structure

```
src/services/
├── index.ts              # Re-export all services
├── user.service.ts       # User business logic
├── auth.service.ts       # Authentication logic
└── types.ts              # Service types
```

### API Route Structure

```
src/app/api/
├── users/
│   ├── route.ts          # GET (list), POST (create)
│   └── [id]/
│       └── route.ts      # GET, PUT, DELETE (single)
├── auth/
│   ├── login/route.ts
│   └── logout/route.ts
```

### Standard Service Method

```typescript
async findById(id: string): Promise<Entity> {
  const result = await db.entity.findUnique({ where: { id } });
  if (!result) {
    throw new NotFoundError(`Entity ${id} not found`);
  }
  return result;
}
```

### Standard API Handler

```typescript
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await service.findAll();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

[Back to Patterns](../index.md) | [Back to Index](../../index.md)
