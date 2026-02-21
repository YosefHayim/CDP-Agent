# Development Cycle

> **Daily workflow** for implementing tasks and iterating on code.

---

## The Development Loop

```
┌─────────────────────────────────────────────────────────┐
│                    DEVELOPMENT CYCLE                     │
├─────────────────────────────────────────────────────────┤
│  1. PLAN     → Understand task, search existing code    │
│  2. DESIGN   → Identify files, plan changes             │
│  3. IMPLEMENT → Write code following patterns           │
│  4. VERIFY   → Test, lint, check for issues             │
│  5. DOCUMENT → Log progress, update docs if needed      │
│  6. COMPLETE → Commit, mark task done                   │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Plan

### Before Writing Any Code

1. **Read the task details**
   ```bash
   task-master show <id>
   ```

2. **Search for existing code**
   ```bash
   grep -ri "related-keyword" src/
   ```

3. **Check existing patterns**
   - Review `patterns/` for relevant guidelines
   - Look at similar implementations in codebase

4. **Identify scope**
   - What files need changes?
   - Are there dependencies on other tasks?
   - Any potential conflicts with other work?

---

## Phase 2: Design

### Create Implementation Plan

Document your plan before coding:

```bash
task-master update-subtask --id=<id> --prompt="
Implementation Plan:

Files to modify:
- src/services/user.service.ts (add validateInput method)
- src/types/user.ts (add ValidationResult type)

Approach:
- Use Zod for validation schema
- Return structured validation errors
- Add unit tests for each validation rule

Potential issues:
- Need to check if Zod is already a dependency
"
```

### Verify Plan

```bash
task-master show <id>  # Confirm plan was logged
```

---

## Phase 3: Implement

### Start Work

```bash
task-master set-status --id=<id> --status=in-progress
```

### Follow Patterns

1. **Check patterns/** for implementation guides
2. **Match existing code style** in the codebase
3. **Use established utilities** instead of creating new ones

### Log Progress Regularly

```bash
task-master update-subtask --id=<id> --prompt="
Progress Update:

Completed:
- Added ValidationResult type
- Implemented basic validation rules

Discovered:
- Zod was already installed (v3.22)
- Found existing validation utils in src/utils/validation.ts

Next:
- Add error handling
- Write tests
"
```

---

## Phase 4: Verify

### Run Tests

```bash
npm test
# or
npm run test:watch
```

### Check Types

```bash
npm run type-check
# or
tsc --noEmit
```

### Lint Code

```bash
npm run lint
# or
npm run lint:fix
```

### Manual Testing

- Test the happy path
- Test edge cases
- Test error scenarios

---

## Phase 5: Document

### If You Discovered Patterns

Update `project/discovered-patterns.md`:

```markdown
### 2024-01-15 - Zod Validation Pattern

**Context**: Implementing input validation for user service

**Pattern**:
```typescript
const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});

const result = schema.safeParse(input);
if (!result.success) {
  throw new ValidationError(result.error.flatten());
}
```

**Why**: Provides type-safe validation with structured errors
```

### Update Relevant Docs

If the implementation revealed:
- Missing patterns → Add to `patterns/`
- Bug prevention rules → Add to `standards/`
- Workflow improvements → Add to `workflows/`

---

## Phase 6: Complete

### Final Verification

```bash
# Run full test suite
npm test

# Check for lint errors
npm run lint

# Type check
npm run type-check
```

### Commit Changes

```bash
git add .
git commit -m "feat(user): add input validation with Zod (#5.2)"
```

### Mark Complete

```bash
task-master set-status --id=<id> --status=done
```

### Move to Next Task

```bash
task-master next
```

---

## Handling Blockers

### When Stuck

1. **Log what you've tried**
   ```bash
   task-master update-subtask --id=<id> --prompt="
   Blocked: Cannot resolve circular dependency
   
   Tried:
   - Moving imports to separate file
   - Using dynamic imports
   
   Need: Guidance on refactoring approach
   "
   ```

2. **Set blocked status**
   ```bash
   task-master set-status --id=<id> --status=blocked
   ```

3. **Document blocker in task**

### When Requirements Change

```bash
# Update future tasks with new context
task-master update --from=<next-task-id> --prompt="
Requirements changed: Now using GraphQL instead of REST.
Affected tasks need updated implementation approach.
"
```

---

## Time Management

### Task Size Guidelines

| Size | Expected Time | Action |
|------|---------------|--------|
| Small | < 1 hour | Complete in one session |
| Medium | 1-4 hours | Plan breaks, log progress |
| Large | > 4 hours | Break into subtasks first |

### When to Break Down Tasks

If a task feels overwhelming:

```bash
task-master expand --id=<id> --research
```

---

## Code Review Preparation

Before requesting review:

- [ ] All tests passing
- [ ] No lint errors
- [ ] Types checked
- [ ] Self-reviewed the diff
- [ ] Task progress documented
- [ ] Commit messages follow conventions

---

[Back to Workflows](./index.md) | [Back to Index](../index.md)
