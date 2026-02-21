# Cline Integration

> **Cline-specific features** - Clinerules, MCP configuration.

---

## Auto-Loaded Files

Cline automatically loads rules from:
- `.clinerules/*.md`

Rules use standard Markdown format.

---

## Rule Format

```markdown
# Rule Title

## Purpose
Brief description of what this rule enforces.

## Guidelines

- **Key Point 1**
  - Details and examples

- **Key Point 2**
  - Details and examples

## Examples

### DO
```code
good example
```

### DON'T
```code
bad example
```
```

---

## MCP Configuration

Configure in VS Code settings or `.vscode/settings.json`:

```json
{
  "cline.mcpServers": {
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

## Project Rules Structure

```
.clinerules/
├── _loader.md         # Points to .ai/ structure
├── cline_rules.md     # Rule formatting guidelines
└── (other rules)      # Project-specific rules
```

### Loader Rule

```markdown
# AI Instructions Loader

This project uses a hierarchical instruction structure in `.ai/`.

## Navigation

- **Standards**: `.ai/standards/` - Universal principles
- **Workflows**: `.ai/workflows/` - Development processes
- **Patterns**: `.ai/patterns/` - Implementation guides
- **Project**: `.ai/project/` - Project-specific config

## Quick Reference

Before writing code, check:
1. `.ai/standards/code-quality.md` - Search before creating
2. `.ai/patterns/` - Follow existing patterns
3. `.ai/workflows/task-management.md` - Track with Task Master
```

---

## MCP Tools

Cline supports the same MCP tools as Claude Code:

```javascript
get_tasks          // View all tasks
next_task          // Get next task
get_task           // Show task details
set_task_status    // Mark complete
expand_task        // Break into subtasks
update_subtask     // Log progress
```

---

## Best Practices

1. **Keep rules simple** - Markdown only, no special syntax
2. **Use clear headings** - Make rules scannable
3. **Include examples** - Show concrete code
4. **Reference .ai/** - Point to central structure
5. **Avoid duplication** - Don't copy content from .ai/

---

## Cline-Specific Features

### Auto-Approval

Configure tool auto-approval in settings:
- Read files: Usually auto-approve
- Write files: Review carefully
- Terminal commands: Review carefully

### Memory Bank

Cline maintains conversation context across sessions through its memory bank feature.

---

[Back to Tools](./index.md) | [Back to Index](../index.md)
