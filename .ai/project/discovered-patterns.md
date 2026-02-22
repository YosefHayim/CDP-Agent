# Discovered Patterns

> **AI-logged patterns** discovered during development.
> Review periodically and promote important patterns to `.ai/patterns/`.

---

## How This Works

1. **AI agents add patterns** they discover while working
2. **You review** periodically (weekly/sprint)
3. **Promote to patterns/** if used 3+ times
4. **Archive** outdated patterns

---

## Recent Patterns

<!-- AI agents: Add new patterns below this line -->

### 2026-02-22 - CDP + Playwright-Extra + Stealth

**Context**: Validated during Task 1 (Validation Spike). Pattern used by karakeep, promptfoo, FellouAI/eko, norish, openclaw.

**Pattern**:
```typescript
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());
const res = await fetch('http://localhost:9222/json/version');
const { webSocketDebuggerUrl } = await res.json();
const browser = await chromium.connectOverCDP(webSocketDebuggerUrl);
```

**Why**: Stealth plugin prevents bot detection on Gemini. connectOverCDP attaches to existing Chrome instance without launching new browser.

**Used in**:
- `src/browser/connection.ts`

**Status**: Validated

---

### 2026-02-22 - Quill Editor Input (NOT page.type())

**Context**: Discovered during validation spike. Gemini uses Quill contenteditable editor which breaks with standard Playwright input methods.

**Pattern**:
```typescript
// CORRECT: execCommand approach
await editor.click();
await page.evaluate((el) => {
  el.focus();
  document.execCommand('insertText', false, 'your text here');
}, editor);

// WRONG: page.type() breaks Quill contenteditable
// await page.type('.ql-editor', 'text'); // DO NOT USE
```

**Why**: Quill intercepts DOM events differently. execCommand triggers the correct Quill internal handlers for text insertion.

**Used in**:
- `src/browser/index.ts` (BrowserBridge.injectText)

**Status**: Validated

---

### 2026-02-22 - Thinking Content Exclusion (queryOutsideThoughts)

**Context**: Gemini renders thinking/reasoning content in separate DOM containers before the actual response. Must filter these out.

**Pattern**:
```typescript
const text = await page.evaluate(() => {
  const allMessages = Array.from(document.querySelectorAll('message-content'));
  const filtered = allMessages.filter(
    (el) =>
      !el.closest('model-thoughts') &&
      !el.closest('.thoughts-container') &&
      !el.closest('.thoughts-content')
  );
  return filtered[filtered.length - 1]?.textContent?.trim() ?? '';
});
```

**Why**: Thinking content appears BEFORE response in DOM order. Without filtering, we'd extract reasoning instead of the actual tool call/response.

**Used in**:
- `src/browser/index.ts` (BrowserBridge.extractResponse)

**Status**: Validated

---

### 2026-02-22 - Streaming Completion Detection (Dual-Signal)

**Context**: Gemini streams responses. Need to know when streaming is complete before extracting response.

**Pattern**:
```typescript
let stableCount = 0;
let lastText = '';
while (true) {
  const text = await extractResponseText(page);
  if (text !== lastText) { lastText = text; stableCount = 0; }
  else stableCount++;
  
  const stopBtn = await page.$('[aria-label="Stop generating"]');
  if (stableCount >= 3 && !stopBtn) break;
  await sleep(500);
}
```

**Why**: Single signal (text stability OR stop button) is unreliable. Dual-signal (both stable text AND no stop button) prevents premature extraction.

**Used in**:
- `src/browser/index.ts` (BrowserBridge.waitForResponse)

**Status**: Validated

---

### 2026-02-22 - Selector Fallback Chain Pattern

**Context**: Gemini DOM structure changes across versions. Single selectors break silently.

**Pattern**:
```typescript
const GEMINI_INPUT = {
  name: 'GEMINI_INPUT',
  selectors: [
    '.ql-editor[contenteditable="true"]',
    'div.textarea[role="textbox"]',
    'rich-textarea [contenteditable]',
    '[contenteditable="true"]',
  ],
};

// NEVER: await page.$('.ql-editor') — single selector breaks on DOM changes
// ALWAYS: await findElement(page, GEMINI_INPUT) — tries each in order
```

**Why**: Resilience against Gemini UI updates. Ordered from most specific to most general.

**Used in**:
- `src/browser/selectors.ts`

**Status**: Validated

---

### 2026-02-22 - Atomic File Writes (Session Persistence)

**Context**: Session files must survive crashes. Direct writes can corrupt on interruption.

**Pattern**:
```typescript
import { writeFileSync, renameSync } from 'fs';
const tmpPath = `${filePath}.tmp`;
writeFileSync(tmpPath, JSON.stringify(data, null, 2));
renameSync(tmpPath, filePath); // atomic on same filesystem
```

**Why**: rename() is atomic on POSIX systems when src/dst are on same filesystem. Prevents partial writes from corrupting session state.

**Used in**:
- `src/session/manager.ts`

**Status**: Validated

---

## Validated Patterns

<!-- Patterns that have been verified as useful -->

All patterns above are validated from the Task 1 (Validation Spike) research phase.

---

## Promoted Patterns

<!-- Patterns moved to .ai/patterns/ -->

| Pattern | Promoted To | Date |
|---------|-------------|------|
| | | |

---

## Archived Patterns

<!-- Patterns that are no longer relevant -->

---

## Review Checklist

When reviewing patterns:

- [ ] Is this pattern used in 3+ places?
- [ ] Does it prevent bugs or save time?
- [ ] Should it be promoted to `patterns/`?
- [ ] Is it still relevant to current codebase?
- [ ] Does it conflict with any standards?

---

*This file is a living document. AI agents and developers both contribute.*
