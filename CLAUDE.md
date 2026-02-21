# Claude Code Instructions

> **Claude Code-specific integration** - Works alongside the centralized `.ai/` structure.

---

## Primary Documentation

All AI instructions are in `.ai/`. This file provides Claude Code-specific pointers.

**Start here:** [.ai/index.md](.ai/index.md)

---

## Quick Links for Claude Code

| Need | Location |
|------|----------|
| **Claude Code Features** | [.ai/tools/claude-code.md](.ai/tools/claude-code.md) |
| **Task Master Workflow** | [.ai/workflows/task-management.md](.ai/workflows/task-management.md) |
| **Code Quality Standards** | [.ai/standards/code-quality.md](.ai/standards/code-quality.md) |
| **Implementation Patterns** | [.ai/patterns/](.ai/patterns/index.md) |

---

## MCP Tools Quick Reference

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

---

## Before Starting Work

1. **Check standards** - [.ai/standards/](.ai/standards/index.md)
2. **Follow patterns** - [.ai/patterns/](.ai/patterns/index.md)
3. **Track with Task Master** - [.ai/workflows/task-management.md](.ai/workflows/task-management.md)
4. **Update discoveries** - [.ai/project/discovered-patterns.md](.ai/project/discovered-patterns.md)

---

## Session Tips

- Use `/clear` between unrelated tasks
- Use `@file` to pull additional context
- MCP tools are preferred over CLI commands

---

*Full documentation: [.ai/index.md](.ai/index.md)*
*Claude Code specifics: [.ai/tools/claude-code.md](.ai/tools/claude-code.md)*
