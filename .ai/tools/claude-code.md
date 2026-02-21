# Claude Code Integration

> **Claude Code-specific features** - MCP tools, slash commands, session management.

---

## Auto-Loaded Files

Claude Code automatically loads:
- `CLAUDE.md` (root)
- `AGENTS.md` (root)

These files reference the `.ai/` hierarchical structure.

---

## MCP Tools (Preferred)

Use MCP tools instead of CLI when available:

```javascript
// Task Management
get_tasks          // View all tasks
next_task          // Get next task to work on
get_task           // Show specific task details
set_task_status    // Mark task complete

// Task Operations
expand_task        // Break down into subtasks
update_subtask     // Log implementation notes
add_task           // Create new task
```

See [Task Management](../workflows/task-management.md) for full reference.

---

## Custom Slash Commands

Create reusable workflows in `.claude/commands/`:

```
.claude/commands/
├── taskmaster-next.md     # /project:taskmaster-next
├── taskmaster-complete.md # /project:taskmaster-complete
└── analyze-file.md        # /project:analyze-file
```

### Example Command

```markdown
<!-- .claude/commands/taskmaster-next.md -->
Find and display the next task to work on using Task Master.
Show the task details including:
- Task ID and title
- Description and implementation details
- Dependencies and their status
- Suggested approach
```

---

## Tool Allowlist

Configure in `.claude/settings.json`:

```json
{
  "allowedTools": [
    "Edit",
    "Bash(task-master *)",
    "Bash(git commit:*)",
    "Bash(git add:*)",
    "Bash(npm run *)",
    "mcp__task_master_ai__*"
  ]
}
```

---

## Session Management

- Use `/clear` between unrelated tasks to maintain focus
- Use `@file` syntax to pull additional context
- Files in `CLAUDE.md` are auto-loaded on every session

---

## Best Practices

1. **Use MCP tools** over CLI commands when possible
2. **Check `.ai/standards/`** before writing new code
3. **Follow `.ai/patterns/`** for implementation
4. **Log progress** with `update_subtask` during work
5. **Update `.ai/project/discovered-patterns.md`** when finding new patterns

---

## MCP Configuration

```json
// .mcp.json
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

[Back to Tools](./index.md) | [Back to Index](../index.md)
