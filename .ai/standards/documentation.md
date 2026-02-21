# Documentation & Self-Improvement Protocol

> **Philosophy**: Documentation is a living artifact. AI agents are authorized and encouraged to improve it.

---

## When to Update Documentation

You are **authorized and encouraged** to update documentation when:

- [ ] You discover a pattern used 3+ times that isn't documented
- [ ] You find a better way to do something already documented
- [ ] You encounter a bug that could be prevented by a rule
- [ ] You make an architectural decision that affects future code
- [ ] A new library or tool is adopted

---

## Where to Document

| Discovery Type | Document Location |
|----------------|-------------------|
| New code pattern (3+ uses) | `patterns/` appropriate subdirectory |
| Project-specific convention | `project/discovered-patterns.md` |
| Bug prevention rule | `standards/` appropriate file |
| Workflow improvement | `workflows/` appropriate file |
| Tool configuration | `tools/` appropriate file |

---

## Update Process

### 1. Identify the Pattern

Ask yourself:
- What should be standardized?
- Is this truly a pattern or a one-off?
- Would documenting this prevent bugs or save time?

### 2. Find Examples

Before documenting, find where this pattern already exists:
```bash
# Search for existing usage
grep -ri "pattern-keyword" src/
```

### 3. Document Clearly

Include:
- **DO** examples (correct implementation)
- **DON'T** examples (anti-patterns)
- **WHY** explanation (reasoning)
- Links to related patterns

### 4. Cross-Reference

Link to related documentation:
- Related patterns in other files
- External documentation when relevant
- Original code examples

---

## Rule Improvement Triggers

Watch for these signals that documentation needs updating:

| Signal | Action |
|--------|--------|
| New code pattern not covered | Add to patterns/ |
| Repeated similar implementations | Extract to reusable pattern |
| Common error patterns | Add prevention rule |
| New libraries used consistently | Document usage patterns |
| Code reviews mention same feedback | Formalize as standard |

---

## Documentation Quality Checks

Before adding documentation, verify:

- [ ] Rules are actionable and specific
- [ ] Examples come from actual code
- [ ] References are up to date
- [ ] Patterns are consistently enforced
- [ ] Both DO and DON'T examples included

---

## Pattern Recognition Example

```typescript
// If you see repeated patterns like:
const data = await prisma.user.findMany({
  select: { id: true, email: true },
  where: { status: 'ACTIVE' }
});

// Consider documenting:
// - Standard select fields
// - Common where conditions
// - Performance optimization patterns
```

---

## Rule Deprecation

When patterns become outdated:

1. **Mark as deprecated** - Add deprecation notice
2. **Document migration** - Show how to update
3. **Set removal date** - Give time to migrate
4. **Update references** - Fix links pointing to deprecated content
5. **Remove after period** - Clean up old content

---

## Changelog Maintenance

After completing a feature or significant fix, update the changelog:

```markdown
## [Unreleased]

### Added
- New UserProfile component with avatar support (#task-id)

### Changed
- Refactored Button to support icon prop (#task-id)

### Fixed
- Cache invalidation in user mutations (#task-id)

### Documented
- Added React Query mutation pattern to patterns/frontend/
```

---

## Continuous Improvement Checklist

Regular maintenance tasks:

- [ ] Monitor code review comments for recurring feedback
- [ ] Track common development questions
- [ ] Update docs after major refactors
- [ ] Add links to relevant external documentation
- [ ] Cross-reference related rules
- [ ] Remove outdated patterns
- [ ] Keep examples synchronized with actual code

---

[Back to Standards](./index.md) | [Back to Index](../index.md)
