# Technology Stack

> **Your project's technology choices** - Update this with your actual stack.
> AI agents reference this when making implementation decisions.

---

## Core Technologies

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

## Key Dependencies

### Runtime

| Package | Version | Purpose |
|---------|---------|---------|
| {{PACKAGE}} | {{VERSION}} | {{PURPOSE}} |

### Development

| Package | Version | Purpose |
|---------|---------|---------|
| {{PACKAGE}} | {{VERSION}} | {{PURPOSE}} |

---

## Environment Requirements

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | {{VERSION}} | Specify LTS version |
| {{RUNTIME}} | {{VERSION}} | e.g., Python, Go, Rust |

---

## Build & Deploy

| Aspect | Choice | Notes |
|--------|--------|-------|
| Build Tool | {{BUILD_TOOL}} | e.g., Vite, Webpack, Turbopack |
| Hosting | {{HOSTING}} | e.g., Vercel, AWS, Railway |
| CI/CD | {{CI_CD}} | e.g., GitHub Actions, GitLab CI |

---

## Conventions

### File Extensions

| Type | Extension |
|------|-----------|
| Components | `.tsx` |
| Utilities | `.ts` |
| Styles | `.css` / `.module.css` |
| Tests | `.test.tsx` / `.spec.ts` |

### Import Aliases

```json
{
  "@/*": ["./src/*"],
  "@/components": ["./src/components"],
  "@/hooks": ["./src/hooks"],
  "@/utils": ["./src/utils"],
  "@/lib": ["./src/lib"],
  "@/types": ["./src/types"]
}
```

---

## Project-Specific Decisions

Document any non-standard choices or deviations from common patterns:

### Decision 1: {{TOPIC}}

**Choice**: {{WHAT_YOU_CHOSE}}

**Rationale**: {{WHY_YOU_CHOSE_IT}}

**Trade-offs**: {{WHAT_YOU_GAVE_UP}}

---

*Last updated: {{DATE}}*
*Update this file when adding major dependencies or changing core technologies.*
