# Workflows

> **Development processes and task management** - How to approach different types of work.

---

## Overview

Workflows describe HOW to do things, not WHAT patterns to use. They cover the process from receiving a task to completing it.

## Documents

| Document | Summary |
|----------|---------|
| [Task Management](./task-management.md) | Task Master commands, MCP tools, CLI reference |
| [Development Cycle](./development-cycle.md) | Daily workflow, iteration process, subtask implementation |
| [Git Conventions](./git-conventions.md) | Commit messages, branch naming, PR workflow |
| [Progress Tracking](./progress-tracking.md) | Mandatory progress updates to `progress-project.md` |

---

## Quick Reference

### Daily Workflow

```
1. task-master next          # What should I work on?
2. task-master show <id>     # Understand the task
3. task-master expand <id>   # Break into subtasks (if complex)
4. [Implement]               # Write the code
5. task-master update-subtask --id=<id> --prompt="findings..."
6. task-master set-status --id=<id> --status=done
7. [Repeat]
```

### Before Starting Any Task

1. Check `standards/code-quality.md` - Search before creating
2. Check `patterns/` - Follow existing patterns
3. Use Task Master to track progress

### After Completing Work

1. Run tests and lint
2. Update documentation if patterns discovered
3. **Update `progress-project.md`** (MANDATORY)
4. Commit with conventional commit message
5. Mark task complete

---

[Back to Index](../index.md)
