# AI Agent Instructions

> **Central Navigation Hub** for all AI coding assistants.
> This file is the entry point - read sections relevant to your current task.
>
> **Standard**: Follows the [agents.md](https://agents.md/) universal specification.
> Supported by Claude Code, Cursor, Cline, Gemini CLI, VS Code Copilot, and 20+ AI tools.

---

## Quick Start

| Your Situation | Start Here |
|----------------|------------|
| New to this project | [Standards](./standards/index.md) - Read first |
| Starting a task | [Workflows](./workflows/index.md) - How to work |
| Writing code | [Patterns](./patterns/index.md) - Implementation guides |
| Setting up tool | [Tools](./tools/index.md) - Tool-specific config |
| Project specifics | [Project](./project/index.md) - Tech stack & customs |

---

## Navigation

### Standards (Universal Principles)

These apply to ALL work, regardless of task type. **Read before creating any new code.**

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [Code Quality](./standards/code-quality.md) | Anti-duplication, DRY, reuse hierarchy | Before creating ANY new code |
| [Debugging Protocol](./standards/debugging-protocol.md) | Bug analysis, 5 Whys, fix quality | When fixing bugs |
| [Documentation](./standards/documentation.md) | Self-improvement, rule updates | After discovering patterns |
| [Architecture](./standards/architecture.md) | Project structure, key files | Understanding codebase layout |

### Workflows (How to Work)

Task-specific processes and development cycles.

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [Task Management](./workflows/task-management.md) | Task Master commands & workflow | Managing work items |
| [Development Cycle](./workflows/development-cycle.md) | Daily dev workflow, iteration | During implementation |
| [Git Conventions](./workflows/git-conventions.md) | Commits, branches, PRs | Before committing |

### Patterns (Implementation Guides)

Specific code patterns for this project. Organized by domain.

| Domain | Entry Point | Contents |
|--------|-------------|----------|
| **Frontend** | [patterns/frontend/](./patterns/frontend/index.md) | Components, styling, data fetching |
| **Backend** | [patterns/backend/](./patterns/backend/index.md) | Services, API routes, error handling |
| **Testing** | [patterns/testing/](./patterns/testing/index.md) | Component tests, service tests |

### Tools (Integration & Setup)

Tool-specific configuration and features. Read the one for your AI assistant.

| Tool | Document | Key Features |
|------|----------|--------------|
| Claude Code | [tools/claude-code.md](./tools/claude-code.md) | MCP, slash commands, tool allowlist |
| Cursor | [tools/cursor.md](./tools/cursor.md) | MDC rules, MCP config |
| Cline | [tools/cline.md](./tools/cline.md) | Clinerules, MCP config |
| Gemini CLI | [tools/gemini-cli.md](./tools/gemini-cli.md) | Sessions, headless mode, Google Search |
| VS Code | [tools/vscode.md](./tools/vscode.md) | GitHub Copilot instructions |

### Project (Customizable)

Project-specific choices. **These files are for YOU to customize.**

| Document | Purpose | Action |
|----------|---------|--------|
| [Tech Stack](./project/tech-stack.md) | Technology choices | Fill in your stack |
| [Discovered Patterns](./project/discovered-patterns.md) | AI-logged patterns | AI agents update this |

---

## How This Architecture Works

```
.ai/
├── index.md          <- YOU ARE HERE (Router)
├── standards/        <- General rules (apply everywhere)
├── workflows/        <- How to do things
├── patterns/         <- Specific code patterns
├── tools/            <- AI tool integrations
└── project/          <- Your customizations
```

### General Standards vs Specific Implementation

| Type | Location | Example |
|------|----------|---------|
| **General Standard** | `standards/` | "Always search before creating new code" |
| **Workflow** | `workflows/` | "Use Task Master to track progress" |
| **Specific Pattern** | `patterns/` | "React components use this file structure" |
| **Tool Config** | `tools/` | "Claude Code uses these MCP tools" |
| **Project Choice** | `project/` | "We use PostgreSQL with Prisma" |

### For AI Agents

1. **Always check `standards/`** before writing new code
2. **Follow `patterns/`** for implementation details
3. **Use `workflows/`** for process guidance
4. **Read your tool's doc** in `tools/` for integration specifics
5. **Update `project/discovered-patterns.md`** when you find new patterns

---

*This file is the source of truth for AI agent navigation. All tool-specific loaders point here.*
