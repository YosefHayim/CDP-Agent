# Tools Integration

> **AI tool-specific configuration** - Setup and features for each AI coding assistant.

---

## Supported Tools

| Tool | Document | Primary Use |
|------|----------|-------------|
| [Claude Code](./claude-code.md) | MCP tools, slash commands, tool allowlist | VS Code / CLI |
| [Cursor](./cursor.md) | MDC rules, MCP configuration | Cursor IDE |
| [Cline](./cline.md) | Clinerules, MCP configuration | VS Code extension |
| [Gemini CLI](./gemini-cli.md) | Sessions, headless mode, Google Search | Terminal |
| [VS Code](./vscode.md) | GitHub Copilot instructions | VS Code |

---

## Compatibility Matrix

| Feature | Claude Code | Cursor | Cline | Gemini CLI | VS Code |
|---------|-------------|--------|-------|------------|---------|
| MCP Tools | Yes | Yes | Yes | Yes | No |
| Custom Commands | Yes | No | No | No | No |
| Rule Auto-load | Yes | Yes | Yes | Yes | Yes |
| Session Persistence | No | Yes | No | Yes | No |
| Web Search | Via MCP | Via MCP | Via MCP | Built-in | No |

---

## How Tools Load Instructions

Each AI tool has a specific file/directory it reads automatically:

| Tool | Auto-loaded Location |
|------|---------------------|
| Claude Code | `CLAUDE.md`, `AGENTS.md` |
| Cursor | `.cursor/rules/*.mdc` |
| Cline | `.clinerules/*.md` |
| Gemini CLI | `GEMINI.md`, `AGENTS.md` |
| VS Code | `.github/instructions/*.md` |

---

## Migration Note

This project uses a **Hierarchical Book Architecture** in `.ai/`. The tool-specific directories (`.cursor/rules/`, `.clinerules/`, `.github/instructions/`) now contain minimal loader files that reference the central `.ai/` structure.

**Benefits:**
- Single source of truth (no duplication)
- Update once, all tools get the change
- Consistent instructions across all AI assistants

---

## Quick Setup

### For New Developers

1. Clone the repository
2. Your AI tool will auto-load from its specific directory
3. The loader files redirect to `.ai/` for actual content
4. Read `.ai/index.md` for navigation

### For Adding New Tool Support

1. Create tool-specific directory if needed
2. Add minimal loader file pointing to `.ai/index.md`
3. Document tool-specific features in `.ai/tools/<tool>.md`
4. Update this index

---

[Back to Index](../index.md)
