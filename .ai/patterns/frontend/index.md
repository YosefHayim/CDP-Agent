# Frontend Patterns

> **React/frontend implementation patterns** - Components, styling, data fetching.

---

## Documents

| Document | Contents |
|----------|----------|
| [Components](./components.md) | Component structure, file organization, props |
| [Styling](./styling.md) | CSS/Tailwind conventions, design tokens |
| [Data Fetching](./data-fetching.md) | React Query patterns, hooks, caching |

---

## Quick Reference

### Component Structure

```
src/components/
├── ComponentName/
│   ├── index.ts              # Re-export
│   ├── ComponentName.tsx     # Main component
│   ├── ComponentName.test.tsx # Tests
│   ├── types.ts              # TypeScript types
│   └── utils.ts              # Component-specific utils
```

### Standard Component Pattern

```tsx
import { cn } from '@/lib/utils';
import type { ComponentNameProps } from './types';

export function ComponentName({ 
  className,
  children,
  ...props 
}: ComponentNameProps) {
  // 1. Hooks first
  const [state, setState] = useState(initial);
  
  // 2. Effects second
  useEffect(() => { ... }, [deps]);
  
  // 3. Handlers third
  const handleAction = () => { ... };
  
  // 4. Render last
  return (
    <div className={cn('base-styles', className)} {...props}>
      {children}
    </div>
  );
}
```

### Hook Naming

```typescript
// Entity hooks
useUser()       // Single entity
useUsers()      // Collection
useCreateUser() // Mutations

// Feature hooks
useAuth()
useTheme()
useLocalStorage()
```

---

[Back to Patterns](../index.md) | [Back to Index](../../index.md)
