# Standards

> **Universal principles that apply to ALL work**, regardless of task type or technology.
> Read these before creating any new code.

---

## Overview

Standards are non-negotiable principles. They represent the minimum bar for code quality and professional practice. Unlike patterns (which are project-specific), standards apply universally.

## Documents

| Document | Summary |
|----------|---------|
| [Code Quality](./code-quality.md) | Anti-duplication rules, DRY principle, reuse hierarchy |
| [Debugging Protocol](./debugging-protocol.md) | Bug analysis, 5 Whys technique, fix quality categories |
| [Documentation](./documentation.md) | Self-improvement protocol, when to update rules |
| [Architecture](./architecture.md) | Project structure, key files reference |

---

## Quick Reference

### Before Writing ANY New Code

```
MANDATORY SEARCH CHECKLIST

[ ] Search for existing components in src/components/
[ ] Search for similar utilities in src/utils/ and src/lib/
[ ] Check type definitions in src/types/
[ ] Review patterns/ for established patterns
[ ] Search codebase for similar functionality
```

### Before Fixing ANY Bug

```
BUG ANALYSIS CHECKLIST

1. REPRODUCE: Can you consistently trigger the bug?
2. ISOLATE: What is the minimal code path that causes it?
3. UNDERSTAND: WHY does this code behave unexpectedly?
4. ROOT CAUSE: Is this a symptom or the actual problem?
5. IMPACT: What else might be affected by this fix?
```

### After Discovering Patterns

- Document in `project/discovered-patterns.md`
- If pattern is used 3+ times, propose adding to `patterns/`
- Update relevant docs when patterns evolve

---

[Back to Index](../index.md)
