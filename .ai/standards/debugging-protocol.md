# Debugging Protocol

> **Philosophy**: A bug fix that doesn't understand the root cause is just another bug waiting to resurface.

---

## Before Fixing ANY Bug

```
BUG ANALYSIS CHECKLIST

1. REPRODUCE: Can you consistently trigger the bug?
2. ISOLATE: What is the minimal code path that causes it?
3. UNDERSTAND: WHY does this code behave unexpectedly?
4. ROOT CAUSE: Is this a symptom or the actual problem?
5. IMPACT: What else might be affected by this fix?
```

---

## The "5 Whys" Technique

Before implementing a fix, ask "why" five times:

```
Bug: User sees stale data after update

Why 1: The UI doesn't refresh after mutation
Why 2: The cache isn't invalidated after the API call
Why 3: The mutation doesn't call queryClient.invalidateQueries()
Why 4: The developer copied from another mutation that didn't need invalidation
Why 5: There's no standard pattern documented for mutations

ROOT CAUSE: Missing mutation pattern in patterns/
FIX: Add pattern + fix this instance + audit other mutations
```

---

## Bug Classification

| Type | Symptoms | Investigation Focus |
|------|----------|---------------------|
| **Logic Error** | Wrong output for valid input | Trace data flow, check conditionals |
| **State Error** | Inconsistent UI/data | Check state mutations, race conditions |
| **Timing Error** | Works sometimes, fails others | Check async operations, dependencies |
| **Data Error** | Fails with specific data | Check edge cases, validation |
| **Integration Error** | Fails at boundaries | Check API contracts, type mismatches |

---

## Fix Quality Categories

| Category | Quality | Example | When Acceptable |
|----------|---------|---------|-----------------|
| **Symptom Fix** | Avoid | Adding `!important` to override CSS | Almost never |
| **Local Fix** | Sometimes OK | Fixing one broken function | Isolated issue |
| **Pattern Fix** | Preferred | Fixing the pattern + all instances | Repeated issue |
| **Architectural Fix** | Best | Preventing the bug class entirely | Systemic issue |

---

## Decision Tree: "How should I fix this bug?"

```
Is this a symptom or root cause?
├── Symptom → Find root cause first
└── Root cause → Is this a pattern problem?
                 ├── Yes → Fix pattern + all instances + update docs
                 └── No → Fix locally + add regression test
```

---

## Post-Fix Requirements

After fixing a bug:

1. **Add regression test** - Prevent it from returning
2. **Audit similar code** - Find other instances:
   ```bash
   grep -ri "similar-pattern" src/
   ```
3. **Update docs** - If pattern was unclear, update patterns/
4. **Log in task** - Use Task Master to document findings

---

## Common Bug Patterns & Solutions

### Stale Closure

```typescript
// BUG: Using stale value in callback
useEffect(() => {
  const interval = setInterval(() => {
    console.log(count); // Always logs initial value
  }, 1000);
  return () => clearInterval(interval);
}, []); // Missing dependency

// FIX: Include dependency or use ref
useEffect(() => {
  const interval = setInterval(() => {
    console.log(count);
  }, 1000);
  return () => clearInterval(interval);
}, [count]); // Correct dependency
```

### Race Condition

```typescript
// BUG: Race condition with async
const handleClick = async () => {
  const data = await fetchData();
  setData(data); // Component might be unmounted
};

// FIX: Check if mounted or use abort controller
const handleClick = async () => {
  const controller = new AbortController();
  try {
    const data = await fetchData({ signal: controller.signal });
    setData(data);
  } catch (e) {
    if (e.name !== 'AbortError') throw e;
  }
  return () => controller.abort();
};
```

### Null Reference

```typescript
// BUG: Not checking for null
const userName = user.profile.name; // Crashes if profile is null

// FIX: Optional chaining + fallback
const userName = user?.profile?.name ?? 'Unknown';
```

---

## When to Escalate

Escalate the bug if:

- [ ] You can't reproduce it consistently
- [ ] The fix would require architectural changes
- [ ] The bug affects security or data integrity
- [ ] You've spent more than 2 hours without progress
- [ ] The fix might break other functionality

---

[Back to Standards](./index.md) | [Back to Index](../index.md)
