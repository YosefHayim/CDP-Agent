# Tech Stack

## Runtime
- **Bun** — JavaScript/TypeScript runtime (native TS execution, fast installs, built-in test runner)
- **TypeScript** — ES2022, strict mode, path aliases (@/*)

## Browser Automation
- **playwright-extra** v4.3.6 — Playwright with plugin support
- **puppeteer-extra-plugin-stealth** v2.11.2 — Anti-detection stealth plugin
- **playwright-core** v1.58.2 — Core Playwright APIs (CDP connection)

## CLI
- **commander** — CLI argument parsing (--prompt, --port, --session, --resume, etc.)

## File Operations
- **diff** (jsdiff) — Unified diff parsing and application for file editing
- **fast-glob** — File system glob search with .gitignore support

## UI/Output
- **chalk** — Terminal color output
- **ora** — Terminal spinner for async operations

## Testing
- **bun test** — Built-in Bun test runner (no Jest/Vitest needed)

## Key Architecture
- CDP (Chrome DevTools Protocol) connection to existing Chrome instance
- ReAct (Reasoning and Acting) loop: THOUGHT → ACTION → OBSERVATION
- JSON tool calls in fenced code blocks
- Session persistence with atomic writes
- Context compression via mechanical stripping
