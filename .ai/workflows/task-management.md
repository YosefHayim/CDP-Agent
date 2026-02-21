# Task Management with Task Master

> **Track your work** with Task Master AI - MCP tools or CLI commands.

---

## Quick Start

### The Basic Loop

```
1. list    → See all tasks
2. next    → Find what to work on
3. show    → Understand the task
4. expand  → Break into subtasks
5. [work]  → Implement
6. update-subtask → Log progress
7. set-status → Mark done
8. [repeat]
```

---

## MCP Tools vs CLI

| Action | MCP Tool | CLI Command |
|--------|----------|-------------|
| List tasks | `get_tasks` | `task-master list` |
| Next task | `next_task` | `task-master next` |
| Show task | `get_task` | `task-master show <id>` |
| Add task | `add_task` | `task-master add-task` |
| Expand task | `expand_task` | `task-master expand --id=<id>` |
| Update subtask | `update_subtask` | `task-master update-subtask --id=<id>` |
| Set status | `set_task_status` | `task-master set-status --id=<id>` |
| Analyze complexity | `analyze_project_complexity` | `task-master analyze-complexity` |

**Recommendation**: Use MCP tools when available (better performance, structured data).

---

## Essential Commands

### View Tasks

```bash
# List all tasks
task-master list

# Filter by status
task-master list --status=pending
task-master list --status=done,in-progress

# Include subtasks
task-master list --with-subtasks
```

### Find Next Task

```bash
# Get next task based on dependencies and priority
task-master next
```

### View Task Details

```bash
# Show specific task
task-master show 5

# Show subtask
task-master show 5.2
```

### Expand Complex Tasks

```bash
# Break task into subtasks
task-master expand --id=5

# With research for better breakdown
task-master expand --id=5 --research

# Specify number of subtasks
task-master expand --id=5 --num=6

# Replace existing subtasks
task-master expand --id=5 --force
```

### Update Progress

```bash
# Log findings to subtask (appends with timestamp)
task-master update-subtask --id=5.2 --prompt="Found that X approach works better because..."

# Update task details
task-master update-task --id=5 --prompt="Scope changed to include Y"
```

### Set Status

```bash
# Mark complete
task-master set-status --id=5 --status=done

# Mark in progress
task-master set-status --id=5.2 --status=in-progress

# Available statuses: pending, in-progress, done, review, blocked, cancelled, deferred
```

---

## Task Breakdown Process

### 1. Analyze Complexity First

```bash
# Get complexity analysis
task-master analyze-complexity --research

# View the report
task-master complexity-report
```

### 2. Expand Based on Complexity

- Score 8-10: Definitely expand
- Score 5-7: Consider expanding
- Score 1-4: May not need subtasks

### 3. Expand with Context

```bash
# Provide additional context
task-master expand --id=5 --prompt="Focus on error handling and edge cases"
```

---

## Iterative Subtask Implementation

### Step 1: Understand

```bash
task-master show 5.2  # Read the subtask details
```

### Step 2: Plan

Explore codebase, identify files/functions to modify, create implementation plan.

### Step 3: Log Plan

```bash
task-master update-subtask --id=5.2 --prompt="
Implementation plan:
- Modify src/services/user.service.ts lines 45-60
- Add new method validateUserInput()
- Update tests in user.service.test.ts
"
```

### Step 4: Implement

```bash
task-master set-status --id=5.2 --status=in-progress
# [Write the code]
```

### Step 5: Log Progress

```bash
task-master update-subtask --id=5.2 --prompt="
Progress:
- Completed validateUserInput() implementation
- Added 5 test cases
- Found edge case: empty strings need special handling
"
```

### Step 6: Complete

```bash
task-master set-status --id=5.2 --status=done
```

---

## Handling Implementation Drift

When implementation differs from plan:

```bash
# Update future tasks with new context
task-master update --from=6 --prompt="
Changed approach: using React Query instead of Redux.
All data fetching tasks need to be updated.
"
```

---

## Dependency Management

```bash
# Add dependency
task-master add-dependency --id=5 --depends-on=3

# Remove dependency
task-master remove-dependency --id=5 --depends-on=3

# Validate all dependencies
task-master validate-dependencies

# Auto-fix dependency issues
task-master fix-dependencies
```

---

## Tagged Task Lists

For multi-context work (features, branches, experiments):

```bash
# List all tags
task-master tags

# Create new tag
task-master add-tag feature-auth --description="Authentication feature"

# Create from git branch
task-master add-tag --from-branch

# Switch context
task-master use-tag feature-auth

# Copy tasks from another tag
task-master add-tag experiment-v2 --copy-from-current
```

---

## Project Setup

### Initialize New Project

```bash
task-master init
```

### Parse PRD to Generate Tasks

```bash
# Parse requirements document
task-master parse-prd requirements.txt

# With specific number of tasks
task-master parse-prd requirements.txt --num-tasks=15
```

---

## Configuration

Configuration stored in `.taskmaster/config.json`. Manage via:

```bash
# View/set models
task-master models

# Interactive setup
task-master models --setup

# Set specific model
task-master models --set-main claude-sonnet-4-20250514
```

**API Keys**: Set in `.env` (CLI) or `mcp.json` (MCP integration).

---

## Task Structure

| Field | Description |
|-------|-------------|
| `id` | Unique identifier (e.g., `5`, `5.2`) |
| `title` | Brief description |
| `description` | Detailed explanation |
| `status` | pending, in-progress, done, etc. |
| `priority` | high, medium, low |
| `dependencies` | IDs of prerequisite tasks |
| `details` | Implementation notes |
| `subtasks` | Breakdown of work items |

---

[Back to Workflows](./index.md) | [Back to Index](../index.md)
