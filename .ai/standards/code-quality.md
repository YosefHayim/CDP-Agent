# Code Quality Standards

> **Philosophy**: Every line of duplicated code is a future bug waiting to happen.
> Senior engineers don't copy-paste; they abstract and reuse.

---

## Anti-Duplication Rules (CRITICAL)

### Mandatory Pre-Implementation Checklist

Before writing ANY new code, complete this checklist:

```
MANDATORY SEARCH CHECKLIST

[ ] Search for existing components in src/components/
[ ] Search for similar utilities in src/utils/ and src/lib/
[ ] Check type definitions in src/types/
[ ] Review patterns/ for established patterns
[ ] Search codebase for similar functionality
```

### Search Commands

```bash
# Find similar components
grep -ri "ComponentName" src/components/
find src/components -name "*.tsx" | xargs grep -l "similar-keyword"

# Find similar utilities
grep -r "export function\|export const" src/utils/ src/lib/

# Find similar types
grep -r "interface\|type " src/types/

# General codebase search
grep -ri "keyword" src/
```

---

## Decision Matrix

| Similarity to Existing | Action |
|------------------------|--------|
| 0-30% | Create new (document why) |
| 30-70% | Consider composition or wrapper |
| 70-90% | Extend existing with new props/options |
| 90-100% | **USE EXISTING** - do not create |

---

## The Reuse Hierarchy

Always prefer options higher in this list:

1. **Use existing** - Exact or near-exact match exists
2. **Configure existing** - Pass different props/options
3. **Compose existing** - Combine multiple existing pieces
4. **Extend existing** - Add new capability to existing code
5. **Fork and modify** - Copy then customize (document why)
6. **Create new** - Truly novel requirement (document why)

---

## Required Documentation for New Code

When creating new components/utilities (options 5-6 above), include:

```typescript
/**
 * @description Brief description of what this does
 * @rationale Why existing code couldn't be used or extended
 * @see RelatedComponent - for similar functionality
 */
```

---

## The "Three Strikes" Rule

If you find yourself writing similar code for the **third time**:

1. **STOP** - This is now a pattern
2. **EXTRACT** - Create a reusable abstraction
3. **DOCUMENT** - Add to patterns/ or project/discovered-patterns.md
4. **REFACTOR** - Update the first two instances

---

## Decision Trees

### "Should I create a new component?"

```
Does similar component exist?
├── Yes → Can it be extended with props?
│         ├── Yes → EXTEND existing
│         └── No → Is it 70%+ similar?
│                  ├── Yes → REFACTOR to be generic
│                  └── No → CREATE new (document why)
└── No → CREATE new (add to index.ts)
```

### "Should I create a new utility?"

```
Does similar function exist?
├── Yes → Same signature?
│         ├── Yes → USE existing
│         └── No → Can existing accept options?
│                  ├── Yes → EXTEND existing
│                  └── No → CREATE new (different name)
└── No → CREATE new (add to index.ts)
```

---

## Anti-Patterns to Avoid

```typescript
// WRONG: Copy-paste with minor modifications
const formatUserName = (user) => `${user.firstName} ${user.lastName}`;
const formatAuthorName = (author) => `${author.firstName} ${author.lastName}`;

// CORRECT: Create reusable utility
const formatFullName = (person: { firstName: string; lastName: string }) => 
  `${person.firstName} ${person.lastName}`;
```

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfileCard.tsx` |
| Hooks | camelCase with `use` prefix | `useUserAuth.ts` |
| Utilities | camelCase | `formatCurrency.ts` |
| Types/Interfaces | PascalCase | `UserResponse`, `CreateUserInput` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Files (non-components) | kebab-case | `api-client.ts` |

---

## Import Order

```typescript
// 1. External packages
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal aliases (@/)
import { Button } from '@/components';
import { useAuth } from '@/hooks';

// 3. Relative imports
import { formatDate } from './utils';
import type { UserProps } from './types';
```

---

[Back to Standards](./index.md) | [Back to Index](../index.md)
