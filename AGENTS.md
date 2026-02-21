# AI Agent Instructions

> **Universal entry point** for all AI coding assistants.
> This file follows the [agents.md](https://agents.md/) specification.

---

## Hierarchical Book Architecture

All detailed instructions are now in `.ai/` for better organization and zero duplication.

**Navigate to:** [.ai/index.md](.ai/index.md)

---

## Quick Navigation

| Need | Location |
|------|----------|
| **Standards** | [.ai/standards/](.ai/standards/index.md) - Code quality, debugging, documentation |
| **Workflows** | [.ai/workflows/](.ai/workflows/index.md) - Task management, dev cycle, git |
| **Patterns** | [.ai/patterns/](.ai/patterns/index.md) - Frontend, backend, testing |
| **Tools** | [.ai/tools/](.ai/tools/index.md) - Claude, Cursor, Cline, Gemini, VS Code |
| **Project** | [.ai/project/](.ai/project/index.md) - Tech stack, discovered patterns |

---

## Before Writing ANY Code

1. **Search first** - [.ai/standards/code-quality.md](.ai/standards/code-quality.md)
2. **Follow patterns** - [.ai/patterns/](.ai/patterns/index.md)
3. **Track work** - [.ai/workflows/task-management.md](.ai/workflows/task-management.md)

---

## Architecture Overview

```
.ai/
├── index.md          # Central navigation (START HERE)
├── standards/        # Universal principles
├── workflows/        # Development processes
├── patterns/         # Implementation guides
│   ├── frontend/
│   ├── backend/
│   └── testing/
├── tools/            # AI tool integrations
└── project/          # Project-specific (customize these)
```

---

## Key Principles

### General Standards vs Specific Patterns

| Type | Location | Example |
|------|----------|---------|
| **Universal** | `standards/` | "Always search before creating new code" |
| **Process** | `workflows/` | "Use Task Master to track progress" |
| **Implementation** | `patterns/` | "React components use this structure" |
| **Tool Config** | `tools/` | "Claude Code uses these MCP tools" |
| **Project** | `project/` | "We use PostgreSQL with Prisma" |

### Your Role as an AI Agent

1. Read `standards/` before writing new code
2. Follow `patterns/` for implementation details
3. Use `workflows/` for process guidance
4. Check your tool's doc in `tools/`
5. Update `project/discovered-patterns.md` when you find new patterns

---

*For full documentation, see [.ai/index.md](.ai/index.md)*
