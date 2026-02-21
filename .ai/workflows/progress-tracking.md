# Progress Tracking Protocol

> **MANDATORY**: Update `progress-project.md` after EVERY task completion.
> This file is the **single source of truth** for project state and context.

---

## Why Progress Tracking?

| Benefit | Description |
|---------|-------------|
| **Continuity** | New sessions instantly know what was done |
| **No Redundancy** | Prevents re-doing completed work |
| **Context** | Provides rationale for past decisions |
| **Visibility** | Shows current state at a glance |

---

## Workflow

### Before Starting Work

1. Read `progress-project.md` to understand current state
2. Check "In Progress" section to avoid duplicate work
3. Update "In Progress" with what you're starting

### After Completing Work

1. Update "Completed Work" with date and task description
2. Update "Current Features" if new feature added
3. Clear task from "In Progress" section
4. Update "Session Notes" for context handoff
5. Update other sections as applicable

---

## Update Format

```markdown
### YYYY-MM-DD

- [x] Task description - Brief implementation notes
- [x] Another task - Relevant context or details
```

---

## Sections to Update

| Section | When | What |
|---------|------|------|
| **Completed Work** | After every task | Date, description, notes |
| **Current Features** | New feature done | Name, status, description |
| **In Progress** | Start/end work | Task, date, agent |
| **Technical Decisions** | Arch choices | Decision, rationale |
| **Known Issues** | Bugs found | Issue, severity, status |
| **Session Notes** | End of session | Context for next session |

---

## Enforcement

- This is **NOT optional**
- No task is too small
- When in doubt, update
- All AI agents must comply

---

## Location

The progress file is at repository root: `progress-project.md`

---

[Back to Workflows](./index.md) | [Back to Index](../index.md)
