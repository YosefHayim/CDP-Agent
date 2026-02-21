# Gemini CLI Instructions

> **Gemini CLI-specific integration** - Works alongside the centralized `.ai/` structure.

---

## Primary Documentation

All AI instructions are in `.ai/`. This file provides Gemini CLI-specific pointers.

**Start here:** [.ai/index.md](.ai/index.md)

---

## Quick Links for Gemini CLI

| Need | Location |
|------|----------|
| **Gemini CLI Features** | [.ai/tools/gemini-cli.md](.ai/tools/gemini-cli.md) |
| **Task Master Workflow** | [.ai/workflows/task-management.md](.ai/workflows/task-management.md) |
| **Code Quality Standards** | [.ai/standards/code-quality.md](.ai/standards/code-quality.md) |
| **Implementation Patterns** | [.ai/patterns/](.ai/patterns/index.md) |

---

## Session Commands

| Command | Purpose |
|---------|---------|
| `/chat` | Start new conversation |
| `/checkpoint save <name>` | Save session state |
| `/checkpoint load <name>` | Resume saved session |
| `/memory show` | View loaded context |
| `/stats` | View token usage |

---

## MCP Tools Quick Reference

```javascript
// Task Management
get_tasks          // View all tasks
next_task          // Get next task
get_task           // Show task details
set_task_status    // Mark complete

// Task Operations
expand_task        // Break into subtasks
update_subtask     // Log progress
add_task           // Create task
```

---

## Before Starting Work

1. **Check standards** - [.ai/standards/](.ai/standards/index.md)
2. **Follow patterns** - [.ai/patterns/](.ai/patterns/index.md)
3. **Track with Task Master** - [.ai/workflows/task-management.md](.ai/workflows/task-management.md)
4. **Update discoveries** - [.ai/project/discovered-patterns.md](.ai/project/discovered-patterns.md)

---

## Gemini CLI Tips

- Use `/checkpoint` to save state after significant progress
- Monitor `/stats` for token usage in long sessions
- Leverage built-in Google Search for research
- MCP tools integrate transparently in conversation

---

*Full documentation: [.ai/index.md](.ai/index.md)*
*Gemini CLI specifics: [.ai/tools/gemini-cli.md](.ai/tools/gemini-cli.md)*
