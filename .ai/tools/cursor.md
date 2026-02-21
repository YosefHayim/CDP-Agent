# Cursor Integration

> **Cursor-specific features** - MDC rules, MCP configuration.

---

## Auto-Loaded Files

Cursor automatically loads rules from:
- `.cursor/rules/*.mdc`
- `.cursor/rules/**/*.mdc`

Rules use MDC (Markdown Component) format with frontmatter.

---

## Rule Format

```markdown
---
description: Clear, one-line description of what the rule enforces
globs: path/to/files/*.ext, other/path/**/*
alwaysApply: boolean
---

- **Main Points in Bold**
  - Sub-points with details
  - Examples and explanations
```

### Always-Apply Rules

For rules that should apply to all files:

```markdown
---
description: Code quality standards
alwaysApply: true
---
```

### File-Specific Rules

For rules that apply to specific file patterns:

```markdown
---
description: React component patterns
globs: src/components/**/*.tsx
---
```

---

## MCP Configuration

Configure in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "npx",
      "args": ["-y", "task-master-ai"],
      "env": {
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}"
      }
    }
  }
}
```

---

## File References

Use MDC link syntax to reference files:

```markdown
[filename](mdc:path/to/file)
```

Examples:
- `[schema.prisma](mdc:prisma/schema.prisma)` - Code reference
- `[other-rule](mdc:.cursor/rules/other.mdc)` - Rule reference

---

## Project Rules Structure

```
.cursor/
├── mcp.json           # MCP server configuration
└── rules/
    ├── _loader.mdc    # Points to .ai/ structure
    └── (other rules)  # Project-specific rules
```

### Loader Rule

The loader rule ensures Cursor reads the hierarchical structure:

```markdown
---
description: Load AI instructions from .ai/
alwaysApply: true
---

Follow instructions in `.ai/index.md` for:
- Standards: `.ai/standards/`
- Workflows: `.ai/workflows/`
- Patterns: `.ai/patterns/`
- Project config: `.ai/project/`
```

---

## Best Practices

1. **Keep rules focused** - One concept per rule file
2. **Use globs** - Target rules to relevant files
3. **Include examples** - Show DO and DON'T patterns
4. **Reference actual code** - Link to real implementations
5. **Update when patterns emerge** - Keep rules current

---

## Cursor-Specific Features

### @file Mentions

Reference files directly in chat:
- `@file:src/components/Button.tsx`

### @codebase Search

Search across the codebase:
- `@codebase how is authentication handled?`

### Composer Mode

For multi-file edits, use Composer (Cmd+I) instead of Chat.

---

[Back to Tools](./index.md) | [Back to Index](../index.md)
