# Project Architecture

> **Purpose**: Understand the codebase structure and know where to find things.

---

## Directory Structure

```
{{PROJECT_NAME}}/
├── .ai/                   # AI agent instructions (YOU ARE HERE)
│   ├── index.md           # Central navigation
│   ├── standards/         # Universal principles
│   ├── workflows/         # Development processes
│   ├── patterns/          # Implementation guides
│   ├── tools/             # AI tool integrations
│   └── project/           # Project-specific config
│
├── src/
│   ├── components/        # Reusable UI components
│   ├── hooks/             # Custom React/framework hooks
│   ├── utils/             # Helper functions and utilities
│   ├── lib/               # Third-party integrations
│   ├── services/          # API calls and business logic
│   ├── types/             # TypeScript type definitions
│   └── app/               # Application routes/pages
│
├── tests/                 # Test files (mirror src/ structure)
├── public/                # Static assets
├── docs/                  # Additional documentation
└── .taskmaster/           # Task Master AI configuration
```

---

## Key Files Reference

| File | Purpose | When to Check |
|------|---------|---------------|
| `.ai/index.md` | AI instruction navigation | Starting any task |
| `.ai/project/tech-stack.md` | Technology choices | Before adding dependencies |
| `src/components/index.ts` | Component exports registry | Before creating new components |
| `src/utils/index.ts` | Utility function exports | Before creating helper functions |
| `src/types/index.ts` | Shared TypeScript types | Before defining new types |
| `src/lib/index.ts` | Third-party integrations | Before adding new integrations |
| `CHANGELOG.md` | Version history | After completing features |
| `package.json` | Dependencies & scripts | Before adding packages |

---

## Component Organization

### Barrel Exports Pattern

Each major directory should have an `index.ts` that re-exports public APIs:

```typescript
// src/components/index.ts
export { Button } from './Button';
export { Card } from './Card';
export { Modal } from './Modal';
export type { ButtonProps, CardProps, ModalProps } from './types';
```

### Component File Structure

```
src/components/
├── ComponentName/
│   ├── index.ts              # Re-export
│   ├── ComponentName.tsx     # Main component
│   ├── ComponentName.test.tsx # Tests
│   ├── types.ts              # TypeScript types
│   └── utils.ts              # Component-specific utils (if needed)
```

---

## Service Layer Organization

```
src/services/
├── index.ts              # Re-export all services
├── user.service.ts       # User-related operations
├── auth.service.ts       # Authentication operations
└── api/
    ├── index.ts          # API client configuration
    ├── endpoints.ts      # API endpoint definitions
    └── types.ts          # API response types
```

---

## Configuration Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript configuration |
| `tailwind.config.js` | Tailwind CSS configuration |
| `eslint.config.js` | ESLint rules |
| `prettier.config.js` | Code formatting |
| `vitest.config.ts` | Test configuration |
| `.env.example` | Environment variables template |

---

## Import Aliases

Configure path aliases for cleaner imports:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components": ["./src/components"],
      "@/hooks": ["./src/hooks"],
      "@/utils": ["./src/utils"],
      "@/lib": ["./src/lib"],
      "@/types": ["./src/types"]
    }
  }
}
```

Usage:
```typescript
// Instead of: import { Button } from '../../../components/Button'
import { Button } from '@/components';
```

---

## Environment Variables

```bash
# .env.example - Template for required variables
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

**Rules:**
- Never commit `.env` files
- Always update `.env.example` when adding new variables
- Use typed environment validation (e.g., with Zod)

---

## AI-Specific Directories

| Directory | Purpose | Tool Support |
|-----------|---------|--------------|
| `.ai/` | Hierarchical instruction book | All AI tools |
| `.taskmaster/` | Task Master configuration | Task Master AI |
| `.cursor/` | Cursor-specific rules | Cursor |
| `.clinerules/` | Cline-specific rules | Cline |
| `.github/instructions/` | VS Code/Copilot instructions | GitHub Copilot |

---

## Finding Things Quickly

### Search Commands

```bash
# Find component definitions
grep -r "export function\|export const" src/components/

# Find hook definitions
grep -r "export function use" src/hooks/

# Find type definitions
grep -r "export interface\|export type" src/types/

# Find service methods
grep -r "async.*=.*=>" src/services/
```

### VS Code / IDE Navigation

- `Cmd+P` / `Ctrl+P` - Quick file open
- `Cmd+Shift+F` / `Ctrl+Shift+F` - Search across files
- `Cmd+Click` / `Ctrl+Click` - Go to definition
- `F12` - Go to definition (alternative)

---

[Back to Standards](./index.md) | [Back to Index](../index.md)
