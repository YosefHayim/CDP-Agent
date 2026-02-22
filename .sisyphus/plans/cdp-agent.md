# CDP-Agent: Autonomous Web-UI CLI Agent

## TL;DR

> **Quick Summary**: Build a local Bun/Node.js CLI tool that acts as an autonomous code agent by hijacking a live Gemini Web UI session via Chrome DevTools Protocol, implementing a ReAct loop where the LLM reasons and emits structured JSON tool calls that the CLI executes locally (read files, search directories, edit via unified diff, run shell commands), feeding results back as observations until the task completes.
> 
> **Deliverables**:
> - CLI binary (`cdp-agent`) that connects to running Chrome via CDP
> - Stealth browser bridge using playwright-extra
> - ReAct loop engine with JSON tool call parsing
> - 4 local tools: read file, search directory, edit file (unified diff), shell execution
> - Full session persistence with resume capability
> - Automatic context compression when conversation grows too long
> - Configuration system (JSON config file + CLI arg overrides)
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 7 waves
> **Critical Path**: Task 1 (validate) → Task 8 (browser bridge) → Task 13 (comms protocol) → Task 16 (ReAct engine) → Task 18 (CLI) → Task 21 (integration tests) → Final verification

---

## Context

### Original Request
Build a local Node.js CLI tool that functions as an autonomous code agent. The core intelligence relies on a live session of the Gemini Web UI (Pro tier), while the local CLI acts as the executor. The system avoids traditional headless browser detection by hijacking the user's active, human-operated Chrome profile via the Chrome DevTools Protocol (CDP). The agent operates on a ReAct (Reasoning and Acting) loop, bridging web-based LLM outputs with local file system operations.

### Interview Summary
**Key Discussions**:
- **Runtime**: Bun chosen for native TS execution, fast installs, built-in test runner
- **Shell access**: Full — no sandboxing, trust the LLM completely
- **Session persistence**: Full — save complete conversation state, tool outputs, file diffs for resume
- **Testing**: Tests after implementation — unit tests for parser/tools/diff, integration for ReAct loop
- **Configuration**: JSON config file (`.cdp-agent.config.json`) + CLI arg overrides
- **Tool call format**: JSON in fenced code blocks — standard, clean, well-parsed
- **Context overflow**: Automatic compression — mechanical stripping of old tool/observation pairs, preserve system prompt + structured memory summary
- **V1 exclusions**: No multi-tab, no image upload, no model selection automation, no browser launch automation, no GUI dashboard

**Research Findings**:
- **Gemini DOM confirmed**: Input is Quill editor (`.ql-editor[contenteditable="true"]`), responses in `message-content` elements, thinking in `model-thoughts` containers. Confirmed across 12+ open-source projects.
- **CDP+Playwright+Stealth confirmed**: `chromium.use(StealthPlugin()); chromium.connectOverCDP(url)` pattern used in production by karakeep, promptfoo, FellouAI/eko, norish, openclaw.
- **Critical DOM trap**: Thinking content appears BEFORE response in DOM order — naive querySelector grabs wrong element. Must filter with `queryOutsideThoughts` pattern.
- **Quill editor trap**: Standard `page.type()` may not work on contenteditable Quill editors. Clipboard paste or `execCommand('insertText')` is the production approach.
- **Streaming detection**: No native DOM signal. Content stability polling (text unchanged for N consecutive polls) + stop-button disappearance is the consensus approach.

### Metis Review
**Identified Gaps** (addressed):
- **Quill editor input validation**: Added as Task 1 (validation spike) — must prove input works before building
- **Thinking vs response DOM confusion**: Made explicit guardrail — filter `model-thoughts` from response extraction
- **Streaming false positives**: Dual-signal approach (stability polling + stop-button) with configurable thresholds
- **Bun + playwright-extra compatibility**: Validated in Task 1 before any other code written
- **Selector fragility**: Dedicated selector registry with ordered fallback arrays + config override
- **Session file corruption**: Atomic writes (temp file → rename) pattern mandated
- **Tool output size limits**: Hard caps per tool with truncation, surfaced to LLM
- **Working directory scope**: File tools scoped to project directory by default, configurable
- **ReAct loop limits**: Max iterations configurable (default 50), max consecutive parse failures (default 3)
- **User interference with Gemini tab**: Out of scope for V1 — document as known limitation

---

## Work Objectives

### Core Objective
Build an autonomous coding agent CLI that bridges a live Gemini Web UI session with local file system operations via a ReAct loop over Chrome DevTools Protocol.

### Concrete Deliverables
- `src/` directory with full TypeScript implementation
- CLI entry point runnable via `bun run src/cli.ts` or compiled binary
- 4 local tools (read, search, edit, shell) in `src/tools/`
- Browser bridge in `src/browser/`
- ReAct engine in `src/engine/`
- Session persistence in `src/session/`
- Configuration system in `src/config/`
- Type definitions in `src/types/`
- JSON config file template (`.cdp-agent.config.json`)
- System prompt template in `src/prompts/`
- Unit + integration tests in `src/tests/`

### Definition of Done
- [ ] `bun run src/cli.ts --prompt "Read package.json and summarize it"` completes a full ReAct loop with Gemini
- [ ] All 4 tools work independently via unit tests
- [ ] Session can be saved, CLI killed, and resumed from saved state
- [ ] Context compression triggers and preserves coherence
- [ ] `bun test` passes all unit and integration tests

### Must Have
- CDP connection to existing Chrome instance via port discovery
- Stealth plugin active to mask automation fingerprints
- Resilient DOM selectors with ordered fallback chains
- Quill editor input via clipboard paste or execCommand (NOT `page.type()`)
- Response extraction that excludes thinking content
- Streaming completion detection via dual-signal (content stability + stop-button)
- JSON tool call parsing from fenced code blocks with error recovery
- Unified diff application for file editing with validation before write
- Full session persistence with atomic writes
- Context compression with structured memory preservation
- Shell command execution with configurable timeout
- Configuration file + CLI argument overrides

### Must NOT Have (Guardrails)
- **NO multi-tab/multi-chat support** — single Gemini conversation only
- **NO image/file upload to Gemini** — text-only interaction
- **NO model selection automation** — user sets model manually
- **NO browser launch automation** — user launches Chrome with `--remote-debugging-port` manually
- **NO GUI/web dashboard** — CLI-only interface
- **NO TUI framework** (blessed, ink, etc.) — basic console output + spinner only
- **NO markdown rendering** of Gemini responses — extract text only
- **NO auto-retry for Gemini rate limits** — surface error to user
- **NO selector auto-healing / ML-based recovery** — static fallback arrays, manual update only
- **NO conversation branching or rollback** — linear conversation only
- **NO LLM-based context summarization** — mechanical stripping only
- **NO config file watching / hot-reload** — read once at startup
- **NO YAML/TOML/rc file chain** — one JSON config file + CLI args
- **NO `page.type()` or `page.fill()` for Quill editor** — clipboard paste or execCommand only
- **NO single DOM selector without fallback** — always use ordered fallback arrays
- **NO streaming output display** — spinner until complete, then show final result
- **NO auto-fallback to full file rewrite when diff fails** — error back to LLM

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (greenfield)
- **Automated tests**: Tests after implementation
- **Framework**: `bun test` (built-in)
- **Pattern**: Implement feature → Write unit tests → Integration tests last

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **CLI/Tool execution**: Use Bash — Run command, assert stdout/stderr/exit code
- **Browser interaction**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **File operations**: Use Bash — Create test files, run tool, diff output
- **Session persistence**: Use Bash — Run agent, kill, resume, verify state

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Validation — MUST complete first, blocks everything):
└── Task 1: Validation Spike [deep]

Wave 1 (Foundation — 6 parallel tasks after validation):
├── Task 2: Project scaffolding + dependency installation [quick]
├── Task 3: TypeScript type definitions [quick]
├── Task 4: Configuration system [unspecified-high]
├── Task 5: Selector registry system [unspecified-high]
├── Task 6: System prompt template design [deep]
└── Task 7: Update .ai/ project documentation [writing]

Wave 2 (Core Modules — 5 parallel tasks):
├── Task 8: Browser Bridge - CDP + stealth + page detection [deep]
├── Task 9: Tool: Read File [quick]
├── Task 10: Tool: Search Directory [quick]
├── Task 11: Tool: Write/Edit File (unified diff) [unspecified-high]
└── Task 12: Tool: Shell Execution [quick]

Wave 3 (Communication + Persistence — 3 parallel tasks):
├── Task 13: Communication Protocol [deep]
├── Task 14: Tool Call Parser [unspecified-high]
└── Task 15: Session Manager [unspecified-high]

Wave 4 (Engine — 2 tasks):
├── Task 16: ReAct Loop Engine [deep]
└── Task 17: Context Compression [unspecified-high]

Wave 5 (CLI + Recovery — 2 parallel tasks):
├── Task 18: CLI Entry Point [unspecified-high]
└── Task 19: Error Recovery & Reconnection [deep]

Wave 6 (Testing — 2 parallel tasks):
├── Task 20: Unit Tests [unspecified-high]
└── Task 21: Integration Tests [deep]

Wave FINAL (Verification — 4 parallel):
├── F1: Plan Compliance Audit [oracle]
├── F2: Code Quality Review [unspecified-high]
├── F3: Real Manual QA [unspecified-high]
└── F4: Scope Fidelity Check [deep]
```

### Critical Path
Task 1 → Task 8 → Task 13 → Task 16 → Task 18 → Task 21 → F1-F4

### Parallel Speedup
~65% faster than sequential. Max concurrent: 6 (Wave 1).

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 2-7 | 0 |
| 2 | 1 | 8-12 | 1 |
| 3 | 1 | 8-12, 14-16 | 1 |
| 4 | 1 | 8, 12, 15-18 | 1 |
| 5 | 1 | 8, 13 | 1 |
| 6 | 1 | 13, 16 | 1 |
| 7 | 1 | — | 1 |
| 8 | 2, 3, 4, 5 | 13, 19 | 2 |
| 9 | 2, 3 | 16 | 2 |
| 10 | 2, 3 | 16 | 2 |
| 11 | 2, 3 | 16 | 2 |
| 12 | 2, 3, 4 | 16 | 2 |
| 13 | 8, 5, 6 | 16 | 3 |
| 14 | 3 | 16 | 3 |
| 15 | 2, 3, 4 | 16, 17, 18 | 3 |
| 16 | 13, 14, 9-12, 15 | 17, 18, 19 | 4 |
| 17 | 15, 16 | 18 | 4 |
| 18 | 8, 16, 15, 4, 17 | 21 | 5 |
| 19 | 8, 13, 16 | 21 | 5 |
| 20 | 9-12, 14 | F1-F4 | 6 |
| 21 | 18, 19 | F1-F4 | 6 |

### Agent Dispatch Summary

| Wave | Tasks | Categories |
|------|-------|-----------|
| 0 | 1 | T1 → `deep` |
| 1 | 6 | T2 → `quick`, T3 → `quick`, T4 → `unspecified-high`, T5 → `unspecified-high`, T6 → `deep`, T7 → `writing` |
| 2 | 5 | T8 → `deep`, T9 → `quick`, T10 → `quick`, T11 → `unspecified-high`, T12 → `quick` |
| 3 | 3 | T13 → `deep`, T14 → `unspecified-high`, T15 → `unspecified-high` |
| 4 | 2 | T16 → `deep`, T17 → `unspecified-high` |
| 5 | 2 | T18 → `unspecified-high`, T19 → `deep` |
| 6 | 2 | T20 → `unspecified-high`, T21 → `deep` |
| FINAL | 4 | F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep` |

---

## TODOs

 [x] 1. Validation Spike — Prove Riskiest Assumptions

  **What to do**:
  - Create `src/validation/spike.ts` — a throwaway ~80-line script that validates:
    1. Bun can import and run `playwright-extra` with `puppeteer-extra-plugin-stealth`
    2. `connectOverCDP` attaches to a running Chrome instance on port 9222
    3. The script navigates to or finds an existing `gemini.google.com` tab
    4. Text can be injected into the Quill editor (`.ql-editor`) via clipboard paste / `execCommand('insertText')`
    5. After injecting text and submitting, a response is extracted from `message-content` while EXCLUDING thinking content (`model-thoughts`)
    6. Streaming completion is detected via content stability polling (text unchanged for 2+ seconds)
  - Install dependencies: `bun add playwright-extra puppeteer-extra-plugin-stealth playwright-core`
  - Output pass/fail for each of the 6 checks to stdout
  - This script is disposable — it exists only to validate assumptions before building real code

  **Must NOT do**:
  - Do NOT build any reusable abstractions — this is a throwaway validation script
  - Do NOT handle errors gracefully — crash loudly on failure so we know what broke
  - Do NOT add types/interfaces — raw inline code only
  - Do NOT use `page.type()` or `page.fill()` for the Quill editor — use clipboard paste or `execCommand`

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: This is a critical validation task requiring careful testing of 6 interconnected assumptions with real browser interaction
  - **Skills**: [`playwright`]
    - `playwright`: Required for CDP connection and DOM interaction testing
  - **Skills Evaluated but Omitted**:
    - `dev-browser`: Not needed — we need raw Playwright API access, not the MCP abstraction

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 0 (solo)
  - **Blocks**: Tasks 2-7 (entire Wave 1)
  - **Blocked By**: None (first task)

  **References**:

  **Pattern References** (existing code to follow):
  - `promptfoo/src/providers/browser.ts:160-170` — Canonical `playwright-extra` + stealth + connectOverCDP pattern (GitHub search result)
  - `norish/server/playwright.ts:5-20` — WebSocket endpoint discovery from Chrome's `/json/version` endpoint
  - `gemini-voyager/src/pages/content/export/index.ts:153-170` — `queryOutsideThoughts` pattern for filtering thinking content from responses

  **API/Type References**:
  - `playwright-core` chromium.connectOverCDP API: `chromium.connectOverCDP(endpointURL: string, options?: { slowMo?: number, timeout?: number })`
  - Chrome DevTools `/json/version` endpoint returns `{ webSocketDebuggerUrl: "ws://..." }`

  **External References**:
  - BrowserStack guide on Playwright CDP connection: `https://www.browserstack.com/guide/playwright-connect-to-existing-browser`
  - Gemini DOM selectors confirmed: `.ql-editor[contenteditable="true"]` for input, `message-content` for responses

  **WHY Each Reference Matters**:
  - promptfoo pattern: Shows exact import and initialization order for stealth + CDP
  - norish pattern: Shows how to discover WebSocket URL from port number (don't require users to find WS URL manually)
  - gemini-voyager pattern: Critical for avoiding the thinking/response DOM confusion bug

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: CDP connection to running Chrome
    Tool: Bash
    Preconditions: Chrome running with --remote-debugging-port=9222, Gemini tab open
    Steps:
      1. Run `curl -s http://localhost:9222/json/version | grep webSocketDebuggerUrl`
      2. Run `bun run src/validation/spike.ts`
      3. Assert stdout contains "CHECK 1 PASS: Bun imports playwright-extra successfully"
      4. Assert stdout contains "CHECK 2 PASS: CDP connection established"
      5. Assert stdout contains "CHECK 3 PASS: Gemini tab found"
    Expected Result: First 3 checks pass, process does not crash
    Failure Indicators: Import error, connection timeout, "no Gemini tab found"
    Evidence: .sisyphus/evidence/task-1-cdp-connection.txt

  Scenario: Quill editor input and response extraction
    Tool: Bash
    Preconditions: CDP connection established (checks 1-3 pass)
    Steps:
      1. Run `bun run src/validation/spike.ts` (full run)
      2. Assert stdout contains "CHECK 4 PASS: Text injected into Quill editor"
      3. Assert stdout contains "CHECK 5 PASS: Response extracted (excludes thinking)"
      4. Assert stdout contains "CHECK 6 PASS: Streaming completion detected"
    Expected Result: All 6 checks pass
    Failure Indicators: "page.type() failed", "response contains thinking content", "timeout waiting for completion"
    Evidence: .sisyphus/evidence/task-1-quill-input.txt

  Scenario: Failure mode — Chrome not running
    Tool: Bash
    Preconditions: Chrome NOT running or port 9222 not open
    Steps:
      1. Run `bun run src/validation/spike.ts`
      2. Assert process exits with non-zero code
      3. Assert stderr contains meaningful error about connection failure
    Expected Result: Clear error message, not a cryptic stack trace
    Evidence: .sisyphus/evidence/task-1-no-chrome.txt
  ```

  **Commit**: YES
  - Message: `feat(validation): validate CDP + Bun + stealth + Quill assumptions`
  - Files: `src/validation/spike.ts`, `package.json`, `bun.lock`
  - Pre-commit: `bun run src/validation/spike.ts` (with Chrome running)

 [x] 2. Project Scaffolding + Dependency Installation

  **What to do**:
  - Create the `src/` directory structure:
    ```
    src/
    ├── browser/          # CDP connection, stealth, DOM interaction
    ├── config/           # Configuration loading, CLI arg parsing
    ├── engine/           # ReAct loop, tool call parser, context compression
    ├── prompts/          # System prompt templates
    ├── session/          # Session persistence, atomic writes
    ├── tools/            # Read file, search dir, edit file, shell
    ├── types/            # TypeScript interfaces and type definitions
    ├── tests/            # Unit and integration tests
    ├── utils/            # Shared utilities (logging, formatting)
    └── cli.ts            # CLI entry point (stub)
    ```
  - Install all dependencies:
    - Runtime: `playwright-extra`, `puppeteer-extra-plugin-stealth`, `playwright-core`, `diff` (jsdiff), `fast-glob`, `chalk`, `ora`, `commander`
    - Dev: `@types/diff`, `@types/node`
  - Create barrel export `index.ts` in each subdirectory (empty stubs)
  - Update `tsconfig.json` if needed (verify `src/` rootDir, path aliases work)
  - Create `.cdp-agent.config.json` template file at project root
  - Add `"bin"` and `"scripts"` entries to `package.json`

  **Must NOT do**:
  - Do NOT implement any logic — only create directory structure, install deps, create stub files
  - Do NOT add unnecessary dependencies — only those listed above
  - Do NOT modify `.ai/` files (that's Task 7)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Straightforward scaffolding task — mkdir, bun add, create stub files
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed for scaffolding

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 3, 4, 5, 6, 7)
  - **Blocks**: Tasks 8-12 (Wave 2)
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `/home/yosef/Desktop/CDP-Agent/tsconfig.json` — Existing TS config with `src/` rootDir, `@/*` path alias, strict mode
  - `/home/yosef/Desktop/CDP-Agent/package.json` — Current minimal package.json (only `glob` dep)

  **External References**:
  - playwright-extra npm: `https://www.npmjs.com/package/playwright-extra`
  - jsdiff npm: `https://www.npmjs.com/package/diff`
  - fast-glob npm: `https://www.npmjs.com/package/fast-glob`

  **WHY Each Reference Matters**:
  - tsconfig.json: Must preserve existing strict settings while ensuring new directory structure compiles
  - package.json: Must add deps without breaking existing structure

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Directory structure exists
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run `ls -la src/browser src/config src/engine src/prompts src/session src/tools src/types src/tests src/utils`
      2. Assert all directories exist
      3. Run `ls src/cli.ts`
      4. Assert file exists
    Expected Result: All directories and cli.ts stub exist
    Failure Indicators: "No such file or directory"
    Evidence: .sisyphus/evidence/task-2-directories.txt

  Scenario: Dependencies installed
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run `bun pm ls | grep -E "playwright-extra|puppeteer-extra-plugin-stealth|playwright-core|diff|fast-glob|chalk|ora|commander"`
      2. Assert all 8 packages listed
      3. Run `bun run tsc --noEmit`
      4. Assert no compilation errors
    Expected Result: All deps installed, TypeScript compiles
    Failure Indicators: Missing packages, TS compilation errors
    Evidence: .sisyphus/evidence/task-2-deps.txt

  Scenario: Config template exists
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run `cat .cdp-agent.config.json`
      2. Assert valid JSON with expected keys (cdpPort, etc.)
    Expected Result: Template config file with documented defaults
    Evidence: .sisyphus/evidence/task-2-config-template.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(scaffold): project structure, dependencies, config template`
  - Files: `src/**/*.ts`, `package.json`, `bun.lock`, `.cdp-agent.config.json`
  - Pre-commit: `bun run tsc --noEmit`

 [x] 3. TypeScript Type Definitions

  **What to do**:
  - Create `src/types/index.ts` with ALL core interfaces for the system:
    - `ToolCall` — `{ tool: string; args: Record<string, unknown> }`
    - `ToolResult` — `{ success: boolean; output: string; error?: string }`
    - `Tool` — `{ name: string; description: string; execute(args): Promise<ToolResult> }`
    - `ReActStep` — `{ thought: string; action: ToolCall; observation: ToolResult; timestamp: number }`
    - `SessionState` — `{ id: string; steps: ReActStep[]; startTime: number; status: 'active' | 'paused' | 'completed' | 'error'; memory: MemorySummary; config: AgentConfig }`
    - `MemorySummary` — `{ goal: string; filesModified: string[]; keyDecisions: string[]; currentStep: string }`
    - `AgentConfig` — `{ cdpPort: number; maxIterations: number; maxParseFailures: number; shellTimeout: number; fileReadMaxSize: number; stabilityThreshold: number; stabilityPollingInterval: number; workingDirectory: string; sessionDir: string; ... }`
    - `SelectorChain` — `{ name: string; selectors: string[]; description: string }`
    - `BrowserConnection` — `{ browser: Browser; page: Page; connected: boolean }`
    - `GeminiMessage` — `{ role: 'user' | 'model'; content: string; timestamp: number }`
    - `ParseResult` — `{ type: 'tool_call' | 'completion' | 'text'; toolCall?: ToolCall; text?: string }`
    - `CompressionResult` — `{ compressedSteps: ReActStep[]; removedCount: number; memorySummary: MemorySummary }`
  - Export all types from barrel `src/types/index.ts`
  - Types should be comprehensive but not over-engineered — they can be refined in later tasks

  **Must NOT do**:
  - Do NOT implement any classes or functions — types/interfaces only
  - Do NOT create separate type files per module yet — one central file for V1
  - Do NOT add runtime validation (Zod schemas) — plain TypeScript types

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Purely type definition work — no logic, no testing needed
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 4, 5, 6, 7)
  - **Blocks**: Tasks 8-16 (nearly everything depends on types)
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `/home/yosef/Desktop/CDP-Agent/.ai/standards/code-quality.md:134-143` — Naming conventions (PascalCase for types, camelCase for properties)
  - `/home/yosef/Desktop/CDP-Agent/tsconfig.json:9` — Strict mode enabled, noUnusedLocals/Parameters

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Types compile without errors
    Tool: Bash
    Preconditions: Task 2 complete (scaffold exists)
    Steps:
      1. Run `bun run tsc --noEmit`
      2. Assert exit code 0
      3. Run `grep -c "export" src/types/index.ts`
      4. Assert at least 12 exports (one per interface listed above)
    Expected Result: All types compile, all exported
    Failure Indicators: TS compilation errors, missing exports
    Evidence: .sisyphus/evidence/task-3-types.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(types): core type definitions for all system layers`
  - Files: `src/types/index.ts`
  - Pre-commit: `bun run tsc --noEmit`

 [x] 4. Configuration System

  **What to do**:
  - Create `src/config/schema.ts` — define the config file JSON structure with defaults
  - Create `src/config/loader.ts` — load config from:
    1. Built-in defaults (hardcoded)
    2. `.cdp-agent.config.json` in project root (if exists, deep-merge over defaults)
    3. CLI arguments (override specific fields)
  - Create `src/config/cli-args.ts` — parse CLI arguments using `commander`:
    - `--prompt <text>` — initial task prompt (required unless --resume)
    - `--port <number>` — CDP port (default: 9222)
    - `--config <path>` — custom config file path
    - `--session <name>` — session name for persistence
    - `--resume <name>` — resume a saved session
    - `--check-connection` — test CDP connection and exit
    - `--max-iterations <n>` — override max loop iterations
    - `--working-dir <path>` — override working directory
    - `--verbose` — enable verbose logging
    - `--help` — show usage
  - Create `src/config/index.ts` — barrel export with `loadConfig()` function that merges all 3 sources
  - Config defaults: `{ cdpPort: 9222, maxIterations: 50, maxParseFailures: 3, shellTimeout: 120000, fileReadMaxSize: 102400, stabilityThreshold: 3, stabilityPollingInterval: 500, workingDirectory: process.cwd(), sessionDir: '.cdp-agent-sessions' }`

  **Must NOT do**:
  - Do NOT use Zod or other validation libraries — simple runtime checks with clear error messages
  - Do NOT implement config file watching/hot-reload
  - Do NOT support YAML, TOML, or rc file chains — JSON only
  - Do NOT add environment variable support (CLI args + config file is sufficient)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Multiple files with merge logic, CLI parsing, and error handling
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 5, 6, 7)
  - **Blocks**: Tasks 8, 12, 15-18
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `/home/yosef/Desktop/CDP-Agent/.cdp-agent.config.json` — The template config file created in Task 2

  **External References**:
  - Commander.js API: `https://github.com/tj/commander.js` — CLI argument parsing

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Default config loads without config file
    Tool: Bash
    Preconditions: No .cdp-agent.config.json in test directory
    Steps:
      1. Run `bun -e "import { loadConfig } from './src/config'; console.log(JSON.stringify(loadConfig({ prompt: 'test' })))"`
      2. Assert JSON output contains cdpPort: 9222, maxIterations: 50
    Expected Result: All defaults present in output
    Failure Indicators: Missing fields, undefined values
    Evidence: .sisyphus/evidence/task-4-default-config.txt

  Scenario: Config file overrides defaults
    Tool: Bash
    Preconditions: .cdp-agent.config.json exists with { "cdpPort": 9333 }
    Steps:
      1. Create test config: `echo '{"cdpPort": 9333}' > /tmp/test-config.json`
      2. Run loader with --config /tmp/test-config.json
      3. Assert cdpPort is 9333, other defaults preserved
    Expected Result: Deep merge works correctly
    Evidence: .sisyphus/evidence/task-4-config-override.txt

  Scenario: CLI args parse correctly
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run `bun run src/cli.ts --help`
      2. Assert output contains --prompt, --port, --session, --resume, --check-connection
      3. Assert exit code 0
    Expected Result: Help text shows all expected flags
    Evidence: .sisyphus/evidence/task-4-cli-help.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(config): configuration loading with defaults, file, and CLI overrides`
  - Files: `src/config/schema.ts`, `src/config/loader.ts`, `src/config/cli-args.ts`, `src/config/index.ts`
  - Pre-commit: `bun run tsc --noEmit`

---


 [x] 5. Selector Registry System

  **What to do**:
  - Create `src/browser/selectors.ts` — a resilient selector system where EVERY DOM interaction uses ordered fallback arrays instead of single selectors
  - Define `SelectorChain` type usage (from `src/types/index.ts`): `{ name: string; selectors: string[]; description: string }`
  - Implement `findElement(page, chain): Promise<ElementHandle | null>` — tries each selector in order, returns first match, logs which selector worked
  - Implement `waitForElement(page, chain, timeout): Promise<ElementHandle>` — same but with polling + timeout, throws descriptive error if all selectors fail
  - Define all known Gemini selector chains:
    - `GEMINI_INPUT`: `['.ql-editor[contenteditable="true"]', 'div.textarea[role="textbox"]', 'textarea', '[contenteditable="true"]']`
    - `GEMINI_SEND_BUTTON`: `['button[aria-label*="Send"]', 'button.send-button', 'button[data-test-id="send-button"]']`
    - `GEMINI_RESPONSE`: `['message-content.model-response-text', 'div.markdown[id^="model-response"]', 'message-content:last-of-type']`
    - `GEMINI_THINKING`: `['model-thoughts', '.thoughts-container', '.thoughts-content']`
    - `GEMINI_STOP_BUTTON`: `['button[aria-label*="Stop"]', 'button.stop-button', '.stop-icon']`
    - `GEMINI_LOADING`: `['.thinking-indicator', '.loading-indicator', '.blue-circle']`
  - Implement `healthCheck(page)` — tests each critical selector chain, reports which work
  - Make selectors overridable via config file (`config.selectors` field)

  **Must NOT do**:
  - Do NOT implement any auto-healing or ML-based selector recovery
  - Do NOT use single selectors anywhere — always SelectorChain

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Critical resilience system with multiple DOM interaction patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 6, 7)
  - **Blocks**: Tasks 8, 13
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `srbhptl39/MCP-SuperAssistant/pages/content/src/plugins/adapters/gemini.adapter.ts` — GeminiAdapter with full DOM selectors for Gemini Web UI
  - `xiaolai/insidebar-ai/content-scripts/focus-toggle.js:25-28` — Gemini input selectors with fallbacks
  - `Nagi-ovo/gemini-voyager/src/pages/content/export/index.ts:153-170` — queryOutsideThoughts pattern

  **WHY Each Reference Matters**:
  - MCP-SuperAssistant: Most complete Gemini DOM interaction found
  - insidebar-ai: Demonstrates exact fallback chain pattern
  - gemini-voyager: Thinking exclusion filter critical for correct response extraction

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Selector fallback chain works when first selector fails
    Tool: Bash
    Preconditions: Page context available
    Steps:
      1. Create a test chain with first selector invalid, second valid
      2. Call findElement with the chain
      3. Assert element found via second selector
      4. Assert log message indicates which selector matched
    Expected Result: Second selector used, element returned
    Evidence: .sisyphus/evidence/task-5-fallback.txt

  Scenario: Health check on live Gemini page
    Tool: Bash
    Preconditions: Chrome running with Gemini tab open
    Steps:
      1. Import selectors, call healthCheck(page)
      2. Assert GEMINI_INPUT chain has at least 1 working selector
      3. Assert GEMINI_RESPONSE chain has at least 1 working selector
    Expected Result: Health check reports passed selectors
    Evidence: .sisyphus/evidence/task-5-health.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(selectors): resilient DOM selector registry with fallback chains`
  - Files: `src/browser/selectors.ts`
  - Pre-commit: `bun run tsc --noEmit`

 [x] 6. System Prompt Template Design

  **What to do**:
  - Create `src/prompts/system-prompt.ts` — the system prompt injected into Gemini at session start
  - The prompt must instruct the LLM to:
    1. Output reasoning as `THOUGHT:` before acting
    2. Output tool calls as JSON in fenced code blocks with `json` language tag
    3. Use exact schema: `{ "tool": "<name>", "args": { ... } }`
    4. Wait for `OBSERVATION:` responses before continuing
    5. Output `TASK_COMPLETE: <summary>` when done
    6. Output `TASK_FAILED: <reason>` if unable to complete
  - Define tool descriptions and argument schemas in the prompt:
    - `read_file`: `{ path: string }` — reads file, returns with line numbers
    - `search_directory`: `{ pattern: string, path?: string }` — glob search, respects .gitignore
    - `edit_file`: `{ path: string, diff: string }` — applies unified diff
    - `shell`: `{ command: string }` — executes shell command, returns stdout/stderr
  - Include examples of correct tool call format
  - Make prompt a template function accepting `{ task, workingDirectory, projectContext? }`
  - Create `src/prompts/observation-format.ts` — format tool results as observation text
  - Create `src/prompts/index.ts` barrel export

  **Must NOT do**:
  - Do NOT over-engineer — concise, focused prompt
  - Do NOT add tool descriptions for non-existent tools
  - Do NOT add multi-language support or prompt variants

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Prompt engineering is critical — system reliability depends on LLM following format
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5, 7)
  - **Blocks**: Tasks 13, 16
  - **Blocked By**: Task 1

  **References**:

  **External References**:
  - ReAct paper: `https://arxiv.org/abs/2210.03629` — canonical Thought/Action/Observation loop
  - SWE-Agent prompt engineering — reliable structured output from chat LLMs

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: System prompt contains all required elements
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run script that imports buildSystemPrompt, generates with test args
      2. Assert output contains 'THOUGHT:' instruction
      3. Assert output contains all 4 tool names
      4. Assert output contains JSON example
      5. Assert output contains 'TASK_COMPLETE'
    Expected Result: Complete, well-formatted system prompt
    Evidence: .sisyphus/evidence/task-6-prompt.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `feat(prompts): system prompt template and observation formatter`
  - Files: `src/prompts/system-prompt.ts`, `src/prompts/observation-format.ts`, `src/prompts/index.ts`
  - Pre-commit: `bun run tsc --noEmit`

 [x] 7. Update .ai/ Project Documentation

  **What to do**:
  - Update `.ai/project/tech-stack.md` — replace ALL placeholders with actual choices (Bun, TypeScript, playwright-extra, Commander.js, jsdiff, fast-glob, chalk, ora, bun test)
  - Update `.ai/standards/architecture.md` — replace React/web-app template with actual CLI project structure (src/browser/, src/config/, src/engine/, src/tools/, etc.)
  - Update `.ai/project/discovered-patterns.md` — document key patterns from research:
    - playwright-extra + stealth + connectOverCDP pattern
    - Gemini Quill editor input via clipboard paste
    - Thinking content exclusion pattern
    - Content stability polling for streaming detection
    - Selector fallback chain pattern
  - Update `progress-project.md` — mark implementation as in-progress

  **Must NOT do**:
  - Do NOT modify source code files
  - Do NOT modify `.ai/standards/code-quality.md`
  - Do NOT create new `.ai/` sections

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Pure documentation updates
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5, 6)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `/home/yosef/Desktop/CDP-Agent/.ai/project/tech-stack.md` — Template with placeholders to fill
  - `/home/yosef/Desktop/CDP-Agent/.ai/standards/architecture.md` — Template to replace with CLI structure
  - `/home/yosef/Desktop/CDP-Agent/.ai/project/discovered-patterns.md` — Empty file to populate
  - `/home/yosef/Desktop/CDP-Agent/progress-project.md` — Project tracker to update

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No remaining placeholders in tech-stack.md
    Tool: Bash
    Steps:
      1. Run `grep '{{' .ai/project/tech-stack.md`
      2. Assert no matches (no remaining placeholders)
      3. Run `grep 'Bun' .ai/project/tech-stack.md`
      4. Assert at least 1 match
    Expected Result: All placeholders replaced
    Evidence: .sisyphus/evidence/task-7-docs.txt
  ```

  **Commit**: YES (groups with Wave 1)
  - Message: `docs: update project documentation with actual tech stack and architecture`
  - Files: `.ai/project/tech-stack.md`, `.ai/standards/architecture.md`, `.ai/project/discovered-patterns.md`, `progress-project.md`


 [x] 8. Browser Bridge — CDP + Stealth + Page Detection

  **What to do**:
  - Create `src/browser/connection.ts` — CDP connection management:
    - `discoverEndpoint(port)`: Fetch `http://localhost:{port}/json/version`, extract `webSocketDebuggerUrl`
    - `connect(config)`: Initialize stealth (`chromium.use(StealthPlugin())`), call `chromium.connectOverCDP(wsUrl)`, return BrowserConnection
    - `findGeminiPage(browser)`: Search `browser.contexts()[0].pages()` for URL matching `gemini.google.com`, return Page
    - `disconnect(connection)`: Graceful disconnect without closing user's browser
    - `isConnected(connection)`: Check if CDP connection is still alive
  - Create `src/browser/index.ts` — barrel export with `BrowserBridge` class that orchestrates connection + page finding + selector health check on startup
  - On connection: run selector health check (from Task 5) and log results
  - Handle connection events: `browser.on('disconnected', ...)` to update state

  **Must NOT do**:
  - Do NOT launch Chrome or create new browser instances
  - Do NOT close the user's browser tab on disconnect
  - Do NOT implement reconnection logic here (that's Task 19)
  - Do NOT interact with Gemini DOM (that's Task 13)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Async connection management with error handling, event-driven state tracking
  - **Skills**: [`playwright`]
    - `playwright`: Required for CDP connection APIs

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 9, 10, 11, 12)
  - **Blocks**: Tasks 13, 19
  - **Blocked By**: Tasks 2, 3, 4, 5

  **References**:

  **Pattern References**:
  - `src/validation/spike.ts` (Task 1 output) — Working CDP connection code to formalize
  - `norish/server/playwright.ts:5-30` — WebSocket endpoint discovery + stealth init pattern
  - `openclaw/src/browser/pw-session.ts:328-340` — CDP connection with retry and cached connection state
  - `karakeep/apps/workers/crawlerWorker.ts:216-220` — `connectOverCDP` with `slowMo` and timeout options

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Connect to Chrome with Gemini tab
    Tool: Bash
    Preconditions: Chrome running with --remote-debugging-port=9222, Gemini tab open
    Steps:
      1. Run script that creates BrowserBridge, calls connect()
      2. Assert connection.connected === true
      3. Assert findGeminiPage returns a Page object
      4. Assert health check reports at least GEMINI_INPUT passed
    Expected Result: Connected, page found, health check passes
    Evidence: .sisyphus/evidence/task-8-connect.txt

  Scenario: Failure — no Chrome running
    Tool: Bash
    Preconditions: Port 9222 not open
    Steps:
      1. Run script that creates BrowserBridge, calls connect()
      2. Assert throws with descriptive error mentioning port 9222
    Expected Result: Clear error about connection failure
    Evidence: .sisyphus/evidence/task-8-no-chrome.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(browser): CDP connection bridge with stealth and page detection`
  - Files: `src/browser/connection.ts`, `src/browser/index.ts`
  - Pre-commit: `bun run tsc --noEmit`

 [x] 9. Tool: Read File

  **What to do**:
  - Create `src/tools/read-file.ts` implementing the `Tool` interface:
    - Accepts `{ path: string }` args
    - Resolves path relative to `config.workingDirectory`
    - Validates path is within working directory (security: no `../../etc/passwd`)
    - Reads file contents using `Bun.file(path).text()`
    - Adds line numbers to output: `1: first line\n2: second line\n...`
    - Truncates output at `config.fileReadMaxSize` (default 100KB) with message: `[TRUNCATED at {n} bytes. Use shell tool to read specific ranges.]`
    - Returns `ToolResult` with `success: true` and formatted content, or `success: false` with error message
    - Handles errors: file not found, permission denied, binary files (detect and reject)

  **Must NOT do**:
  - Do NOT read binary files — detect by checking for null bytes and return error
  - Do NOT follow symlinks outside working directory

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, straightforward file I/O with basic validation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 10, 11, 12)
  - **Blocks**: Task 16
  - **Blocked By**: Tasks 2, 3

  **References**:

  **Pattern References**:
  - `/home/yosef/Desktop/CDP-Agent/src/types/index.ts` (Task 3 output) — Tool and ToolResult interfaces

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Read existing file with line numbers
    Tool: Bash
    Steps:
      1. Create test file `/tmp/test-read.txt` with 3 lines
      2. Run read_file tool with path pointing to test file
      3. Assert output contains '1: ' prefix on first line
      4. Assert success === true
    Expected Result: File contents with line numbers
    Evidence: .sisyphus/evidence/task-9-read.txt

  Scenario: File not found returns error
    Tool: Bash
    Steps:
      1. Run read_file with path '/tmp/nonexistent-file-abc123.txt'
      2. Assert success === false
      3. Assert error message contains 'not found' or 'ENOENT'
    Expected Result: Graceful error, not crash
    Evidence: .sisyphus/evidence/task-9-not-found.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(tools): read file tool with line numbers and size limits`
  - Files: `src/tools/read-file.ts`

 [x] 10. Tool: Search Directory

  **What to do**:
  - Create `src/tools/search-directory.ts` implementing the `Tool` interface:
    - Accepts `{ pattern: string, path?: string }` args
    - Uses `fast-glob` to search from `path` (default: config.workingDirectory)
    - Respects `.gitignore` via fast-glob's `ignore` option (read `.gitignore` and `node_modules` exclusion)
    - Returns formatted list of matching file paths (relative to working directory)
    - Limits results to 200 files with message: `[{total} matches found, showing first 200]`
    - Returns `ToolResult` with formatted path list

  **Must NOT do**:
  - Do NOT traverse into `node_modules`, `.git`, `dist`, `build` directories
  - Do NOT return absolute paths — always relative to working directory

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple glob wrapper with filtering
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 11, 12)
  - **Blocks**: Task 16
  - **Blocked By**: Tasks 2, 3

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Search finds TypeScript files
    Tool: Bash
    Steps:
      1. Run search_directory with pattern '**/*.ts' in project root
      2. Assert output contains at least 1 file path
      3. Assert output does NOT contain 'node_modules'
    Expected Result: TS files listed, node_modules excluded
    Evidence: .sisyphus/evidence/task-10-search.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(tools): search directory tool with gitignore support`
  - Files: `src/tools/search-directory.ts`

 [x] 11. Tool: Write/Edit File (Unified Diff)

  **What to do**:
  - Create `src/tools/edit-file.ts` implementing the `Tool` interface:
    - Accepts `{ path: string, diff: string }` args
    - Uses `jsdiff` (`diff` npm package) `applyPatch()` to apply unified diff to file
    - Before applying: read original file, validate patch applies cleanly
    - If patch fails: return `ToolResult` with `success: false` and specific error (which hunk failed, context mismatch details)
    - If patch succeeds: write patched content atomically (write temp → rename), return success with summary of changes
    - Handle new file creation: if path doesn't exist and diff creates it, create with content
    - Handle full file writes: if diff is not valid unified diff format, check if it's raw content and write as-is (fallback for new files)
    - Validate path is within working directory

  **Must NOT do**:
  - Do NOT auto-retry with a different strategy if patch fails — return error to LLM
  - Do NOT auto-fallback to full file rewrite — LLM must explicitly request it
  - Do NOT write partial patches — all-or-nothing

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Unified diff parsing and application has edge cases (whitespace, context, hunks)
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 10, 12)
  - **Blocks**: Task 16
  - **Blocked By**: Tasks 2, 3

  **References**:

  **External References**:
  - jsdiff API: `https://github.com/kpdecker/jsdiff` — `applyPatch(source, patch, options?)` function

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Apply valid unified diff
    Tool: Bash
    Steps:
      1. Create file `/tmp/test-edit.txt` with known content
      2. Create valid unified diff that changes line 2
      3. Run edit_file tool
      4. Read result file, assert line 2 changed correctly
      5. Assert success === true
    Expected Result: File patched correctly
    Evidence: .sisyphus/evidence/task-11-edit.txt

  Scenario: Invalid diff returns descriptive error
    Tool: Bash
    Steps:
      1. Run edit_file with a diff that has wrong context lines
      2. Assert success === false
      3. Assert error describes the mismatch
    Expected Result: Error message helps LLM fix the diff
    Evidence: .sisyphus/evidence/task-11-bad-diff.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(tools): edit file tool with unified diff support`
  - Files: `src/tools/edit-file.ts`

 [x] 12. Tool: Shell Execution

  **What to do**:
  - Create `src/tools/shell.ts` implementing the `Tool` interface:
    - Accepts `{ command: string }` args
    - Executes via `Bun.spawn()` or `child_process.exec` with configurable timeout (`config.shellTimeout`, default 120s)
    - Captures stdout and stderr separately
    - Returns `ToolResult` with combined output: `STDOUT:\n{stdout}\n\nSTDERR:\n{stderr}\nEXIT CODE: {code}`
    - On timeout: kill process, return error with `[COMMAND TIMED OUT after {n}ms]`
    - Working directory: `config.workingDirectory`
    - Truncate output at 100KB with truncation message

  **Must NOT do**:
  - Do NOT sandbox or restrict commands — full shell access as decided
  - Do NOT add command confirmation prompts
  - Do NOT run commands in background/detached mode

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple shell execution wrapper with timeout
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8, 9, 10, 11)
  - **Blocks**: Task 16
  - **Blocked By**: Tasks 2, 3, 4

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Execute simple command
    Tool: Bash
    Steps:
      1. Run shell tool with command 'echo hello world'
      2. Assert stdout contains 'hello world'
      3. Assert exit code 0
    Expected Result: Command runs, output captured
    Evidence: .sisyphus/evidence/task-12-shell.txt

  Scenario: Command timeout
    Tool: Bash
    Steps:
      1. Run shell tool with command 'sleep 10' and timeout 1000ms
      2. Assert success === false
      3. Assert error contains 'TIMED OUT'
    Expected Result: Process killed, timeout error returned
    Evidence: .sisyphus/evidence/task-12-timeout.txt
  ```

  **Commit**: YES (groups with Wave 2)
  - Message: `feat(tools): shell execution tool with timeout`
  - Files: `src/tools/shell.ts`

 [x] 13. Communication Protocol — Gemini Page Interaction

  **What to do**:
  - Create `src/browser/protocol.ts` with these core functions:
    - `injectText(page: Page, text: string): Promise<void>` — Inject text into Gemini's Quill editor:
      - Try clipboard approach first: `page.evaluate(() => navigator.clipboard.writeText(text))` → focus editor → Ctrl+V
      - Fallback: `page.evaluate(() => document.execCommand('insertText', false, text))` on the `.ql-editor[contenteditable="true"]` element
      - Verify injection by reading back `.ql-editor` textContent and comparing
      - MUST NOT use `page.type()` or `page.fill()` — Quill intercepts these incorrectly
    - `submitMessage(page: Page): Promise<void>` — Click the send button:
      - Selector fallback chain: `button[aria-label="Send message"]` → `button.send-button` → `button[data-test-id="send-button"]`
      - Wait for button to be enabled (not disabled/aria-disabled) before clicking
      - After click, wait 500ms and verify input area is cleared
    - `extractResponse(page: Page): Promise<string>` — Get latest model response:
      - Select ALL `message-content` elements, take the LAST one
      - MUST filter out thinking panels: remove content from `.model-thoughts`, `.thoughts-container`, `.thoughts-content` elements
      - Strip HTML tags, normalize whitespace, return plain text
      - If no message-content elements found, return empty string (don't throw)
    - `waitForCompletion(page: Page, config: AppConfig): Promise<boolean>` — Wait for response to finish:
      - Dual-signal approach:
        1. Content stability: poll `extractResponse()` every `config.pollingIntervalMs` (default 2000ms). If content unchanged for 3 consecutive polls → complete
        2. Stop button disappearance: watch for `button[aria-label="Stop generating"]` to disappear
      - Either signal triggers completion
      - Timeout after `config.responseTimeoutMs` (default 120000ms) → return false
      - Return true if completed normally
  - Export all functions + a `GeminiProtocol` object bundling them together
  - Import selectors from `src/browser/selectors.ts` (Task 5) — do NOT hardcode selectors

  **Must NOT do**:
  - Do NOT use `page.type()` or `page.fill()` for text injection — Quill editor breaks with these
  - Do NOT use a single selector without fallback — always chain through fallback arrays
  - Do NOT include thinking panel content in extracted responses
  - Do NOT throw on empty responses — return empty string gracefully

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex browser interaction with multiple fallback strategies, dual-signal waiting, and DOM manipulation requiring careful implementation
  - **Skills**: [`playwright`]
    - `playwright`: DOM interaction, selector strategies, waiting patterns — core domain overlap
  - **Skills Evaluated but Omitted**:
    - `dev-browser`: This is programmatic automation, not interactive browsing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14, 15)
  - **Blocks**: Task 16 (ReAct Loop needs protocol to communicate with Gemini)
  - **Blocked By**: Task 5 (selectors), Task 6 (CDP connection — needs Page object)

  **References**:

  **Pattern References**:
  - `src/browser/selectors.ts` (Task 5) — Selector fallback arrays to import
  - `src/browser/connection.ts` (Task 6) — Page object source and CDP connection pattern

  **API/Type References**:
  - `src/types/index.ts` (Task 3) — `AppConfig` type with `pollingIntervalMs`, `responseTimeoutMs` fields
  - `src/types/index.ts` (Task 3) — `GeminiSelectors` type with editor, sendButton, messageContent, stopButton, thinkingPanel fields

  **External References**:
  - Playwright `page.evaluate()` docs — for clipboard and execCommand injection
  - Quill editor internals — `.ql-editor[contenteditable="true"]` is the editable div
  - Research finding: `model-thoughts` / `.thoughts-container` / `.thoughts-content` are Gemini's thinking panel classes
  - Research finding: norish/gemini-voyager project uses similar clipboard-paste approach for Quill

  **WHY Each Reference Matters**:
  - selectors.ts provides the tested fallback chains — protocol MUST import, not duplicate
  - connection.ts's `getPage()` returns the Page object this module operates on
  - AppConfig has the timeout and polling values — protocol MUST read from config, not hardcode
  - Quill's `.ql-editor` is the ONLY reliable injection target — `textarea` and `input` don't exist

  **Acceptance Criteria**:
  - [ ] `src/browser/protocol.ts` exists with all 4 functions exported
  - [ ] Text injection uses clipboard paste (primary) or execCommand (fallback), never page.type/fill
  - [ ] Response extraction excludes thinking panel content
  - [ ] `waitForCompletion` uses dual-signal (content stability + stop button)
  - [ ] All selectors imported from `src/browser/selectors.ts`, not hardcoded

  **QA Scenarios:**

  ```
  Scenario: Inject text into Quill editor
    Tool: Bash (bun eval)
    Preconditions: Chrome open with Gemini page, CDP connection available
    Steps:
      1. Connect to Chrome via CDP using connection module
      2. Call `injectText(page, "Hello from CDP-Agent test")`
      3. Read back `.ql-editor` textContent via `page.evaluate()`
      4. Assert textContent contains "Hello from CDP-Agent test"
    Expected Result: Text appears in Gemini input box, verified by readback
    Failure Indicators: page.type detected in code, empty editor after injection, Quill formatting corrupted
    Evidence: .sisyphus/evidence/task-13-inject.txt

  Scenario: Extract response excluding thinking panel
    Tool: Bash (bun eval)
    Preconditions: Gemini page has at least one response with thinking panel visible
    Steps:
      1. Call `extractResponse(page)`
      2. Assert result does NOT contain text from `.model-thoughts` elements
      3. Assert result contains the actual response text (from `message-content`)
      4. Assert result is plain text (no HTML tags)
    Expected Result: Clean response text without thinking content
    Failure Indicators: Response includes "Thinking..." prefix, HTML tags in output, empty when response exists
    Evidence: .sisyphus/evidence/task-13-extract.txt

  Scenario: Wait for completion with timeout
    Tool: Bash (bun eval)
    Preconditions: No active generation (idle state)
    Steps:
      1. Call `waitForCompletion(page, { ...config, responseTimeoutMs: 3000 })`
      2. Should return within ~3 seconds (timeout since no generation active)
      3. Assert return value is false (timeout, not normal completion)
    Expected Result: Returns false after timeout period
    Evidence: .sisyphus/evidence/task-13-timeout.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(browser): communication protocol for Gemini page interaction`
  - Files: `src/browser/protocol.ts`

 [x] 14. Tool Call Parser

  **What to do**:
  - Create `src/engine/parser.ts` with:
    - `parseResponse(text: string): ParseResult` where `ParseResult` is:
      ```
      type ParseResult = {
        reasoning: string;      // Text before any code block
        toolCalls: ToolCall[];  // Parsed JSON tool calls
        signals: {
          taskComplete: boolean;   // Detected TASK_COMPLETE
          taskFailed: boolean;     // Detected TASK_FAILED
          failureReason?: string;  // Reason from TASK_FAILED
        };
        raw: string;             // Original text
      }
      ```
    - JSON extraction logic:
      - Find all ` ```json ... ``` ` blocks using regex: `/```json\s*\n([\s\S]*?)\n```/g`
      - For each block, try `JSON.parse()`
      - If parse fails, attempt recovery: strip trailing commas, fix unquoted keys, try again
      - Each valid JSON should match `ToolCall` shape: `{ tool: string, args: Record<string, unknown> }`
      - Skip blocks that don't match ToolCall shape (might be data output)
    - Signal detection:
      - Scan for `TASK_COMPLETE` (case-insensitive) anywhere in text → `signals.taskComplete = true`
      - Scan for `TASK_FAILED` (case-insensitive) → `signals.taskFailed = true`
      - If TASK_FAILED found, extract reason: text after "TASK_FAILED:" or "TASK_FAILED -" up to newline
    - Reasoning extraction:
      - Everything before the first ` ```json ` block = reasoning text
      - Trim whitespace
    - Return all parsed data in one `ParseResult` object

  **Must NOT do**:
  - Do NOT throw on malformed JSON — return empty toolCalls array with the raw text preserved
  - Do NOT assume only one tool call per response — handle multiple ` ```json ``` ` blocks
  - Do NOT use `eval()` or `Function()` for JSON parsing — `JSON.parse()` only

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Moderate complexity string parsing with regex, JSON recovery, and multi-format handling
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction needed — pure string processing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 13, 15)
  - **Blocks**: Task 16 (ReAct Loop needs parser to interpret responses)
  - **Blocked By**: Task 3 (types — needs ToolCall, ParseResult type definitions)

  **References**:

  **Pattern References**:
  - Research finding: Gemini outputs tool calls as JSON inside fenced code blocks — this is the agreed format from interview

  **API/Type References**:
  - `src/types/index.ts` (Task 3) — `ToolCall` type: `{ tool: string, args: Record<string, unknown> }`
  - `src/types/index.ts` (Task 3) — `ParseResult` type as defined above

  **External References**:
  - JSON recovery patterns: strip trailing commas with regex `/,\s*([}\]])/g` → `$1`
  - Research finding: LLMs frequently produce JSON with trailing commas and unquoted keys

  **WHY Each Reference Matters**:
  - ToolCall type defines the contract that Tool implementations expect
  - JSON recovery is critical because Gemini's output isn't guaranteed valid JSON
  - The fenced code block format was explicitly agreed during interview — parser must match this exact format

  **Acceptance Criteria**:
  - [ ] `src/engine/parser.ts` exists with `parseResponse` function exported
  - [ ] Extracts reasoning text before first code block
  - [ ] Parses valid JSON tool calls from fenced code blocks
  - [ ] Recovers from trailing commas in JSON
  - [ ] Detects TASK_COMPLETE and TASK_FAILED signals
  - [ ] Returns empty toolCalls (not throws) on completely malformed input

  **QA Scenarios:**

  ```
  Scenario: Parse valid tool call
    Tool: Bash (bun eval)
    Steps:
      1. Call parseResponse with:
         'I need to read the file first.\n```json\n{"tool": "read_file", "args": {"path": "src/index.ts"}}\n```'
      2. Assert result.reasoning === 'I need to read the file first.'
      3. Assert result.toolCalls.length === 1
      4. Assert result.toolCalls[0].tool === 'read_file'
      5. Assert result.toolCalls[0].args.path === 'src/index.ts'
      6. Assert result.signals.taskComplete === false
    Expected Result: Clean parse with reasoning and one tool call
    Evidence: .sisyphus/evidence/task-14-valid-parse.txt

  Scenario: Handle malformed JSON with trailing comma
    Tool: Bash (bun eval)
    Steps:
      1. Call parseResponse with:
         '```json\n{"tool": "shell", "args": {"command": "ls -la",}}\n```'
      2. Assert result.toolCalls.length === 1 (recovered)
      3. Assert result.toolCalls[0].tool === 'shell'
    Expected Result: JSON recovered, tool call extracted
    Evidence: .sisyphus/evidence/task-14-malformed.txt

  Scenario: Detect TASK_COMPLETE signal
    Tool: Bash (bun eval)
    Steps:
      1. Call parseResponse with: 'I have completed the task. TASK_COMPLETE'
      2. Assert result.signals.taskComplete === true
      3. Assert result.toolCalls.length === 0
    Expected Result: Signal detected, no tool calls
    Evidence: .sisyphus/evidence/task-14-complete.txt

  Scenario: Multiple tool calls in one response
    Tool: Bash (bun eval)
    Steps:
      1. Call parseResponse with text containing two ```json blocks
      2. Assert result.toolCalls.length === 2
      3. Assert each has correct tool name
    Expected Result: Both tool calls extracted in order
    Evidence: .sisyphus/evidence/task-14-multiple.txt

  Scenario: No code blocks — pure reasoning
    Tool: Bash (bun eval)
    Steps:
      1. Call parseResponse with: 'Let me think about this problem.'
      2. Assert result.reasoning contains 'Let me think'
      3. Assert result.toolCalls.length === 0
      4. Assert result.signals.taskComplete === false
    Expected Result: Reasoning captured, no crashes
    Evidence: .sisyphus/evidence/task-14-no-tools.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(engine): tool call parser with JSON recovery and signal detection`
  - Files: `src/engine/parser.ts`

 [x] 15. Session Manager

  **What to do**:
  - Create `src/session/manager.ts` with:
    - `SessionManager` class:
      - Constructor takes `sessionDir: string` (from `config.sessionDir`, default `.cdp-agent/sessions`)
      - `save(state: SessionState): Promise<void>` — Atomic write:
        1. Serialize `SessionState` to JSON with 2-space indent
        2. Write to temp file: `{sessionDir}/{state.id}.tmp`
        3. Rename temp → final: `{sessionDir}/{state.id}.json`
        4. This ensures no corrupt files if process crashes mid-write
      - `load(id: string): Promise<SessionState | null>` — Load session:
        1. Read `{sessionDir}/{id}.json`
        2. Parse JSON with try/catch
        3. On parse failure: log warning, rename corrupt file to `.corrupt`, return null
        4. Validate basic structure (has `id`, `steps`, `createdAt` fields)
        5. Return parsed `SessionState` or null
      - `list(): Promise<SessionInfo[]>` — List available sessions:
        1. Read directory, filter for `.json` files
        2. For each, read and parse, extract `{ id, createdAt, lastStepAt, stepCount, prompt }`
        3. Sort by `lastStepAt` descending (most recent first)
    - `SessionState` type (define in `src/types/index.ts` via Task 3):
      ```
      type SessionState = {
        id: string;
        prompt: string;
        steps: ReActStep[];
        memorySummary?: MemorySummary;
        config: Partial<AppConfig>;  // Snapshot of config at session start
        createdAt: string;           // ISO timestamp
        lastStepAt: string;          // ISO timestamp of last step
      }
      ```
    - Ensure `sessionDir` is created (mkdir -p equivalent) on first save

  **Must NOT do**:
  - Do NOT use synchronous file operations — all async
  - Do NOT throw on corrupt session files — graceful degradation (rename to .corrupt, return null)
  - Do NOT store absolute paths in session — store relative to working directory

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: File I/O with atomic write pattern, error handling, and data validation
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction — pure filesystem operations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 13, 14)
  - **Blocks**: Task 16 (ReAct Loop saves session after each step)
  - **Blocked By**: Task 3 (types — needs SessionState, ReActStep, MemorySummary types)

  **References**:

  **Pattern References**:
  - Atomic write pattern: `writeFile(path + '.tmp', data)` → `rename(path + '.tmp', path)` — standard crash-safe persistence
  - Research finding: karakeep project uses similar atomic-write session persistence

  **API/Type References**:
  - `src/types/index.ts` (Task 3) — `SessionState`, `ReActStep`, `MemorySummary` type definitions
  - `src/types/index.ts` (Task 3) — `AppConfig` type for config snapshot
  - Bun's `Bun.write()` for file operations — faster than Node fs

  **External References**:
  - `node:fs/promises` `rename()` — atomic on same filesystem (POSIX guarantee)
  - `Bun.write()` docs — Bun's optimized file writing API

  **WHY Each Reference Matters**:
  - Atomic write prevents data loss — if crash occurs during write, old file remains intact
  - SessionState type is the serialization contract — must match exactly for load/save round-trip
  - Bun.write is significantly faster than fs.writeFile for this use case

  **Acceptance Criteria**:
  - [ ] `src/session/manager.ts` exists with SessionManager class
  - [ ] `save()` uses atomic write (temp file + rename)
  - [ ] `load()` returns null (not throws) on corrupt files
  - [ ] `load()` renames corrupt files to `.corrupt`
  - [ ] `list()` returns sessions sorted by most recent first
  - [ ] Session directory auto-created on first save

  **QA Scenarios:**

  ```
  Scenario: Save and load round-trip
    Tool: Bash (bun eval)
    Preconditions: Clean temp directory for test sessions
    Steps:
      1. Create SessionManager with temp directory
      2. Create a SessionState with id='test-1', prompt='test', steps=[], createdAt=now
      3. Call save(state)
      4. Assert file exists at `{tempDir}/test-1.json`
      5. Assert NO .tmp file remains
      6. Call load('test-1')
      7. Assert loaded.id === 'test-1'
      8. Assert loaded.prompt === 'test'
    Expected Result: Perfect round-trip — saved data matches loaded data
    Evidence: .sisyphus/evidence/task-15-roundtrip.txt

  Scenario: Corrupt file graceful degradation
    Tool: Bash (bun eval)
    Steps:
      1. Create SessionManager with temp directory
      2. Write invalid JSON to `{tempDir}/corrupt-1.json`: '{invalid json'
      3. Call load('corrupt-1')
      4. Assert return value is null (not exception)
      5. Assert `{tempDir}/corrupt-1.json.corrupt` exists (renamed)
      6. Assert `{tempDir}/corrupt-1.json` does NOT exist
    Expected Result: Null return, corrupt file preserved with .corrupt suffix
    Evidence: .sisyphus/evidence/task-15-corrupt.txt

  Scenario: List sessions sorted by most recent
    Tool: Bash (bun eval)
    Steps:
      1. Create SessionManager with temp directory
      2. Save session with id='old', lastStepAt='2025-01-01T00:00:00Z'
      3. Save session with id='new', lastStepAt='2025-06-01T00:00:00Z'
      4. Call list()
      5. Assert result[0].id === 'new' (most recent first)
      6. Assert result[1].id === 'old'
    Expected Result: Sessions ordered newest first
    Evidence: .sisyphus/evidence/task-15-list.txt
  ```

  **Commit**: YES (groups with Wave 3)
  - Message: `feat(session): session manager with atomic persistence and corruption recovery`
  - Files: `src/session/manager.ts`

 [x] 16. ReAct Loop Engine

  **What to do**:
  - Create `src/engine/react-loop.ts` with:
    - `ReActLoop` class:
      - Constructor takes: `protocol: GeminiProtocol`, `parser: parseResponse`, `sessionManager: SessionManager`, `tools: Map<string, Tool>`, `config: AppConfig`
      - `run(prompt: string, sessionId?: string): Promise<ReActResult>` — Main loop:
        1. If `sessionId` provided, load existing session via SessionManager
        2. Otherwise, create new session with generated ID
        3. Build initial message: system prompt + user prompt (or resume from last state)
        4. Inject initial message via `protocol.injectText()` + `protocol.submitMessage()`
        5. Loop:
           a. `protocol.waitForCompletion()` — wait for Gemini to respond
           b. `protocol.extractResponse()` — get response text
           c. `parser.parseResponse(text)` — parse into reasoning + tool calls + signals
           d. If `signals.taskComplete` → save session, return success result
           e. If `signals.taskFailed` → save session, return failure result
           f. If `toolCalls.length === 0` and no signals → increment emptyResponseCount. If >= 3 consecutive → inject nudge message: "Please respond with a tool call or TASK_COMPLETE/TASK_FAILED"
           g. For each toolCall: look up tool in `tools` Map → execute → collect `ToolResult`
           h. Format observation message with tool results (see format below)
           i. Inject observation via `protocol.injectText()` + `protocol.submitMessage()`
           j. Record step in session: `{ iteration, reasoning, toolCalls, observations, timestamp }`
           k. Save session via SessionManager (after EVERY step)
           l. Check iteration count: if >= `config.maxIterations` (default 50) → save, return timeout result
           m. Check if compression needed: `shouldCompress(session.steps, config)` → if yes, compress
           n. Increment iteration counter
        6. Return `ReActResult`: `{ success, steps, sessionId, finalResponse }`
      - Tool registry: `tools: Map<string, Tool>` — register tools by name at construction
      - Parse failure handling: if `parser.parseResponse` returns 0 toolCalls AND no signals for `config.maxParseFailures` (default 3) consecutive iterations → abort with error
    - Observation format:
      ```
      [Tool Result: {toolName}]
      Success: true/false
      Output:
      {tool output text, truncated to 100KB}
      ```
    - If multiple tool calls in one response, concatenate all observations
  - Export `ReActLoop` class and `ReActResult` type

  **Must NOT do**:
  - Do NOT execute tools in parallel — sequential execution only (order matters for file operations)
  - Do NOT swallow tool execution errors — capture in ToolResult and send as observation
  - Do NOT skip session save on any step — persistence after EVERY iteration
  - Do NOT exceed `config.maxIterations` without returning — always honor the cap
  - Do NOT hardcode any prompt text — read system prompt from `src/prompts/system.md` (Task 6)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core orchestration component with complex state management, error handling, and multi-module integration. Most architecturally critical task.
  - **Skills**: [`playwright`]
    - `playwright`: Protocol interaction requires understanding Playwright page patterns
  - **Skills Evaluated but Omitted**:
    - `dev-browser`: Not interactive browsing — programmatic automation

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on many Wave 3 outputs)
  - **Parallel Group**: Wave 4 (with Task 17, but 17 also depends on 16)
  - **Blocks**: Tasks 17, 18, 19
  - **Blocked By**: Tasks 13, 14, 15, 9, 10, 11, 12 (protocol, parser, session, all tools)

  **References**:

  **Pattern References**:
  - `src/browser/protocol.ts` (Task 13) — GeminiProtocol with injectText, submitMessage, extractResponse, waitForCompletion
  - `src/engine/parser.ts` (Task 14) — parseResponse returning ParseResult with toolCalls and signals
  - `src/session/manager.ts` (Task 15) — SessionManager with save/load for persistence
  - `src/tools/*.ts` (Tasks 9-12) — Tool implementations with execute() method returning ToolResult
  - Research finding: promptfoo's ReAct implementation uses similar loop-with-tool-registry pattern

  **API/Type References**:
  - `src/types/index.ts` (Task 3) — `Tool`, `ToolResult`, `ReActStep`, `ReActResult`, `SessionState` types
  - `src/types/index.ts` (Task 3) — `AppConfig` with `maxIterations`, `maxParseFailures` fields
  - `src/prompts/system.md` (Task 6) — System prompt template read at startup

  **External References**:
  - ReAct pattern paper: Reason → Act → Observe loop
  - Research finding: typical ReAct implementations cap at 20-50 iterations

  **WHY Each Reference Matters**:
  - Protocol module is the ONLY way to communicate with Gemini — loop must use its exact API
  - Parser is the ONLY way to interpret Gemini's responses — loop must handle all ParseResult shapes
  - SessionManager ensures crash recovery — saving after EVERY step means at most 1 step lost on crash
  - Tool registry pattern decouples loop from specific tool implementations — new tools can be added without modifying loop

  **Acceptance Criteria**:
  - [ ] `src/engine/react-loop.ts` exists with ReActLoop class exported
  - [ ] Loop calls protocol → parser → tool → format observation → inject back
  - [ ] Session saved after EVERY iteration (not just on completion)
  - [ ] Loop honors `maxIterations` cap
  - [ ] Parse failures tracked and abort after `maxParseFailures` consecutive failures
  - [ ] TASK_COMPLETE and TASK_FAILED signals handled correctly
  - [ ] Tool results formatted as specified observation format

  **QA Scenarios:**

  ```
  Scenario: Full ReAct loop with mock protocol
    Tool: Bash (bun eval)
    Preconditions: Mock protocol returning pre-scripted responses
    Steps:
      1. Create MockProtocol that returns:
         - First call: '{reasoning}\n```json\n{"tool": "read_file", "args": {"path": "package.json"}}\n```'
         - Second call: 'I have read the file. TASK_COMPLETE'
      2. Create ReActLoop with mock protocol, real parser, real tools, temp session dir
      3. Call loop.run('Read package.json')
      4. Assert result.success === true
      5. Assert result.steps.length === 2
      6. Assert session file exists in temp dir
    Expected Result: Loop completes in 2 iterations with success
    Evidence: .sisyphus/evidence/task-16-mock-loop.txt

  Scenario: Loop respects maxIterations
    Tool: Bash (bun eval)
    Steps:
      1. Create MockProtocol that always returns a tool call (never completes)
      2. Create ReActLoop with config.maxIterations = 3
      3. Call loop.run('Infinite task')
      4. Assert result.success === false
      5. Assert result.steps.length === 3
    Expected Result: Loop stops after 3 iterations, not infinite
    Evidence: .sisyphus/evidence/task-16-max-iterations.txt

  Scenario: Parse failure abort
    Tool: Bash (bun eval)
    Steps:
      1. Create MockProtocol that returns unparseable gibberish
      2. Create ReActLoop with config.maxParseFailures = 2
      3. Call loop.run('Broken task')
      4. Assert result.success === false
      5. Assert error indicates parse failure abort
    Expected Result: Aborts after 2 consecutive parse failures
    Evidence: .sisyphus/evidence/task-16-parse-abort.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(engine): ReAct loop with tool registry and session persistence`
  - Files: `src/engine/react-loop.ts`

 [x] 17. Context Compression

  **What to do**:
  - Create `src/engine/compression.ts` with:
    - `shouldCompress(steps: ReActStep[], config: AppConfig): boolean`:
      - Calculate total text size across all steps (reasoning + observations)
      - Return true if total exceeds `config.compressionThresholdBytes` (default 100KB = 102400)
    - `compress(steps: ReActStep[], config: AppConfig): CompressedContext`:
      - Keep: system prompt (always), first 2 steps (establishes task context), last 5 steps (recent work)
      - Strip: all middle steps
      - Build `MemorySummary` from stripped steps
      - Return `CompressedContext`: `{ preservedSteps: ReActStep[], memorySummary: MemorySummary }`
    - `buildMemorySummary(steps: ReActStep[]): MemorySummary`:
      - Extract from stripped steps:
        - `goal`: first step's reasoning (truncated to 500 chars)
        - `filesModified`: deduplicated list of files from write_file/edit_file tool calls
        - `filesRead`: deduplicated list of files from read_file tool calls
        - `shellCommands`: list of shell commands executed (last 10)
        - `keyDecisions`: extract lines containing "decision:", "chose", "because" from reasoning (heuristic)
        - `errors`: any tool results with success === false (last 5)
      - Format as structured text for injection back into conversation
    - `formatMemoryForInjection(memory: MemorySummary): string`:
      - Render as:
        ```
        [Context Compression — Previous conversation summarized]
        Goal: {goal}
        Files Modified: {list}
        Files Read: {list}
        Recent Commands: {list}
        Key Decisions: {list}
        Recent Errors: {list}
        [End Summary — Continuing from step {N}]
        ```
  - Export all functions

  **Must NOT do**:
  - Do NOT use any LLM for summarization — mechanical extraction only
  - Do NOT discard the first 2 or last 5 steps — always preserve these
  - Do NOT compress if total text is under threshold — return original steps unchanged
  - Do NOT lose file modification history — always extract from tool calls

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Data transformation with heuristic extraction — moderate complexity, no external dependencies
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction — pure data processing

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 16, though depends on ReActStep types)
  - **Parallel Group**: Wave 4 (with Task 16)
  - **Blocks**: Task 18 (CLI needs compression for long sessions)
  - **Blocked By**: Task 15 (session types), Task 3 (ReActStep type)

  **References**:

  **Pattern References**:
  - Interview decision: "Mechanical stripping of old tool/observation pairs, preserve system prompt + structured memory summary"
  - Interview decision: "Keep first 2 + last 5 steps" — agreed upon during context overflow discussion

  **API/Type References**:
  - `src/types/index.ts` (Task 3) — `ReActStep`, `MemorySummary`, `CompressedContext` types
  - `src/types/index.ts` (Task 3) — `AppConfig` with `compressionThresholdBytes` field

  **External References**:
  - Research finding: 100KB is roughly 25K tokens — good threshold for context window management

  **WHY Each Reference Matters**:
  - The compression strategy was explicitly agreed in interview — deviating from "first 2 + last 5" would break the contract
  - MemorySummary must preserve file modification history — the LLM needs to know what it already changed

  **Acceptance Criteria**:
  - [ ] `src/engine/compression.ts` exists with all functions exported
  - [ ] `shouldCompress` returns false when under threshold
  - [ ] `shouldCompress` returns true when over threshold
  - [ ] `compress` preserves first 2 + last 5 steps
  - [ ] `buildMemorySummary` extracts files modified, files read, shell commands
  - [ ] `formatMemoryForInjection` produces human-readable summary text
  - [ ] NO LLM calls anywhere in module

  **QA Scenarios:**

  ```
  Scenario: Compression not triggered under threshold
    Tool: Bash (bun eval)
    Steps:
      1. Create 3 ReActSteps with small text (~100 bytes each)
      2. Call shouldCompress(steps, { compressionThresholdBytes: 102400 })
      3. Assert return === false
    Expected Result: No compression when under 100KB
    Evidence: .sisyphus/evidence/task-17-no-compress.txt

  Scenario: Compression triggered over threshold
    Tool: Bash (bun eval)
    Steps:
      1. Create 20 ReActSteps with large observations (~10KB each = 200KB total)
      2. Call shouldCompress(steps, { compressionThresholdBytes: 102400 })
      3. Assert return === true
      4. Call compress(steps, config)
      5. Assert result.preservedSteps.length === 7 (first 2 + last 5)
      6. Assert result.memorySummary is not null
      7. Assert result.memorySummary.filesModified contains files from stripped steps
    Expected Result: Middle steps stripped, memory summary built
    Evidence: .sisyphus/evidence/task-17-compress.txt

  Scenario: Memory summary extraction
    Tool: Bash (bun eval)
    Steps:
      1. Create steps with tool calls: read_file('a.ts'), write_file('b.ts'), shell('npm test')
      2. Call buildMemorySummary(steps)
      3. Assert memory.filesRead includes 'a.ts'
      4. Assert memory.filesModified includes 'b.ts'
      5. Assert memory.shellCommands includes 'npm test'
      6. Call formatMemoryForInjection(memory)
      7. Assert output contains '[Context Compression'
      8. Assert output contains 'a.ts' and 'b.ts'
    Expected Result: Structured summary with all tracked data
    Evidence: .sisyphus/evidence/task-17-summary.txt
  ```

  **Commit**: YES (groups with Wave 4)
  - Message: `feat(engine): context compression with mechanical stripping and memory summary`
  - Files: `src/engine/compression.ts`

 [x] 18. CLI Entry Point

  **What to do**:
  - Create `src/cli.ts` as the main entry point:
    - Use `commander` for CLI argument parsing:
      - `--prompt <text>` — Task prompt to execute (required unless --resume)
      - `--resume <id>` — Resume a previous session by ID
      - `--session <id>` — Name/ID for this session (auto-generated if omitted)
      - `--config <path>` — Path to config file (default: `.cdp-agent.config.json`)
      - `--cdp-port <port>` — Chrome debugging port (default: 9222, overrides config)
      - `--working-dir <path>` — Working directory for file operations (default: cwd)
      - `--check-connection` — Test CDP connection and exit
      - `--list-sessions` — List available sessions and exit
      - `--verbose` — Enable debug logging
      - `--help` — Show help
    - Orchestration flow:
      1. Parse CLI args via commander
      2. Load config file (Task 4's `loadConfig`)
      3. Merge CLI overrides into config
      4. If `--check-connection`: connect to Chrome, verify Gemini tab, print status, exit
      5. If `--list-sessions`: call SessionManager.list(), display table, exit
      6. If `--resume`: load session, connect to Chrome, start ReAct loop from saved state
      7. Otherwise: connect to Chrome, verify Gemini tab, start ReAct loop with prompt
    - Display:
      - Use `ora` spinner during Gemini thinking: `"Gemini is thinking..."`
      - Use `chalk` for colored output:
        - Green: success messages, TASK_COMPLETE
        - Red: errors, TASK_FAILED
        - Yellow: warnings, retries
        - Cyan: tool execution info
        - Dim: iteration count, session ID
      - After each iteration, print: `[Step N] {tool_name} → {success/fail}` (one line)
      - On completion, print full final response from Gemini
    - SIGINT handler (Ctrl+C):
      1. Catch SIGINT signal
      2. Save current session state via SessionManager
      3. Print: `"\nSession saved: {sessionId}. Resume with: bun run src/cli.ts --resume {sessionId}"`
      4. Exit with code 0
    - Error display:
      - CDP connection failure: `"Failed to connect to Chrome on port {port}. Is Chrome running with --remote-debugging-port={port}?"`
      - No Gemini tab: `"Connected to Chrome but no Gemini tab found. Open gemini.google.com first."`
      - Session not found: `"Session '{id}' not found. Use --list-sessions to see available sessions."`
  - Register all 4 tools in the tool Map before passing to ReActLoop
  - Read system prompt from `src/prompts/system.md` at startup

  **Must NOT do**:
  - Do NOT use any TUI framework (blessed, ink, etc.) — basic console + spinner only
  - Do NOT render markdown in output — plain text only
  - Do NOT add --model or --temperature flags — no model selection automation
  - Do NOT auto-launch Chrome — user must start it manually
  - Do NOT add config hot-reloading — read once at startup

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Moderate complexity orchestration with many module integrations but straightforward logic
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: CLI doesn't do direct browser interaction — delegates to protocol/connection modules

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 19)
  - **Parallel Group**: Wave 5 (with Task 19)
  - **Blocks**: Task 21 (integration tests need CLI)
  - **Blocked By**: Tasks 8, 16, 15, 4, 17 (browser bridge, ReAct loop, session, config, compression)

  **References**:

  **Pattern References**:
  - `src/engine/react-loop.ts` (Task 16) — ReActLoop class to instantiate and run
  - `src/browser/connection.ts` (Task 8) — connectToChrome(), getPage(), verifyGeminiTab()
  - `src/session/manager.ts` (Task 15) — SessionManager for save/load/list
  - `src/config/loader.ts` (Task 4) — loadConfig() for configuration loading
  - `src/tools/*.ts` (Tasks 9-12) — All 4 tool implementations to register

  **API/Type References**:
  - `src/types/index.ts` (Task 3) — `AppConfig`, `Tool`, `ReActResult` types
  - `commander` npm — CLI argument parsing API
  - `ora` npm — Spinner API: `ora('text').start()`, `.succeed()`, `.fail()`
  - `chalk` npm — Color API: `chalk.green()`, `chalk.red()`, `chalk.yellow()`, `chalk.cyan()`, `chalk.dim()`

  **External References**:
  - commander docs: `https://github.com/tj/commander.js`
  - ora docs: `https://github.com/sindresorhus/ora`

  **WHY Each Reference Matters**:
  - ReActLoop is the core engine CLI orchestrates — CLI must construct it with correct dependencies
  - Connection module provides Chrome access — CLI must call connectToChrome() before creating loop
  - SessionManager enables resume capability — CLI must wire session ID from args to manager
  - Config loader handles file + defaults — CLI must merge its overrides on top

  **Acceptance Criteria**:
  - [ ] `src/cli.ts` exists with commander-based CLI
  - [ ] `--help` shows all options with descriptions
  - [ ] `--check-connection` connects and reports status
  - [ ] `--list-sessions` shows available sessions
  - [ ] `--prompt` starts a ReAct loop
  - [ ] `--resume` loads and continues a session
  - [ ] SIGINT saves session and prints resume command
  - [ ] Spinner shows during Gemini thinking
  - [ ] Step-by-step progress printed with colors

  **QA Scenarios:**

  ```
  Scenario: CLI help output
    Tool: Bash
    Steps:
      1. Run `bun run src/cli.ts --help`
      2. Assert exit code 0
      3. Assert stdout contains '--prompt'
      4. Assert stdout contains '--resume'
      5. Assert stdout contains '--check-connection'
      6. Assert stdout contains '--cdp-port'
    Expected Result: Clean help text with all options
    Evidence: .sisyphus/evidence/task-18-help.txt

  Scenario: Check connection (Chrome running)
    Tool: Bash
    Preconditions: Chrome running with --remote-debugging-port=9222, Gemini tab open
    Steps:
      1. Run `bun run src/cli.ts --check-connection`
      2. Assert stdout contains 'Connected to Chrome via CDP'
      3. Assert stdout contains 'Gemini page detected'
      4. Assert exit code 0
    Expected Result: Successful connection report
    Evidence: .sisyphus/evidence/task-18-check-connection.txt

  Scenario: Check connection (Chrome not running)
    Tool: Bash
    Preconditions: Chrome NOT running or port 9222 not open
    Steps:
      1. Run `bun run src/cli.ts --check-connection --cdp-port 19999`
      2. Assert exit code non-zero
      3. Assert stderr contains 'Failed to connect'
    Expected Result: Clear error message about connection failure
    Evidence: .sisyphus/evidence/task-18-no-chrome.txt

  Scenario: SIGINT saves session
    Tool: Bash
    Preconditions: Chrome running with Gemini
    Steps:
      1. Run `bun run src/cli.ts --prompt "Count to 100" --session sigint-test &`
      2. Wait 5 seconds (let loop start)
      3. Send SIGINT to process: `kill -INT $!`
      4. Assert output contains 'Session saved'
      5. Assert file exists at `.cdp-agent/sessions/sigint-test.json`
    Expected Result: Session persisted on Ctrl+C
    Evidence: .sisyphus/evidence/task-18-sigint.txt
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `feat(cli): entry point with commander, spinner, session resume`
  - Files: `src/cli.ts`

 [x] 19. Error Recovery & Reconnection

  **What to do**:
  - Create `src/engine/recovery.ts` with:
    - `withRetry<T>(fn: () => Promise<T>, config: RetryConfig): Promise<T>` — Generic retry wrapper:
      - `RetryConfig`: `{ maxRetries: number, baseDelayMs: number, maxDelayMs: number, retryOn?: (error: Error) => boolean }`
      - Exponential backoff: delay = min(baseDelayMs * 2^attempt, maxDelayMs)
      - Default: 3 retries, 2000ms base, 16000ms max
      - Log each retry: `"Retry {N}/{max} after {delay}ms: {error.message}"`
      - If all retries exhausted, throw the last error
    - `handleCDPDisconnect(connection: BrowserConnection, config: AppConfig): Promise<Page>` — CDP-specific recovery:
      - Catch CDP disconnection errors (detect via error message patterns: "Target closed", "Session closed", "Connection refused")
      - Attempt reconnection using `withRetry` with config: 3 retries, 2s/4s/8s backoff
      - After reconnect, re-discover Gemini tab
      - Return new Page object
      - If reconnection fails after all retries, save session and throw
    - `detectRecoverableError(error: Error): ErrorClassification` — Error classification:
      - `ErrorClassification`: `{ type: 'cdp_disconnect' | 'captcha' | 'rate_limit' | 'session_expired' | 'unknown', recoverable: boolean, message: string }`
      - CDP disconnect: connection-related error messages → `{ type: 'cdp_disconnect', recoverable: true }`
      - CAPTCHA: detect "unusual traffic" or CAPTCHA-related text in page → `{ type: 'captcha', recoverable: false, message: 'CAPTCHA detected. Please solve it manually and retry.' }`
      - Rate limit: detect "too many requests" or rate limit indicators → `{ type: 'rate_limit', recoverable: false, message: 'Rate limited. Wait and retry.' }`
      - Session expired: detect "session expired" or redirect to login → `{ type: 'session_expired', recoverable: false, message: 'Gemini session expired. Re-login and retry.' }`
      - Unknown: anything else → `{ type: 'unknown', recoverable: false }`
    - `RecoveryMiddleware` class (wraps ReActLoop step execution):
      - `executeWithRecovery(step: () => Promise<void>, session: SessionState): Promise<void>`
      - On error: classify → if recoverable, attempt recovery → if not, save session and throw
  - Export all functions and classes

  **Must NOT do**:
  - Do NOT auto-retry rate limits — surface to user (per guardrails)
  - Do NOT attempt CAPTCHA solving — surface to user
  - Do NOT retry indefinitely — always honor max retries
  - Do NOT lose session data on ANY error — always save before throwing

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex error classification with multiple failure modes, retry logic, and state preservation
  - **Skills**: [`playwright`]
    - `playwright`: Needed for understanding CDP disconnect patterns and page object handling
  - **Skills Evaluated but Omitted**:
    - `dev-browser`: Not interactive browsing — error recovery patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 18)
  - **Parallel Group**: Wave 5 (with Task 18)
  - **Blocks**: Task 21 (integration tests need error recovery)
  - **Blocked By**: Tasks 8, 13, 16 (browser connection, protocol, ReAct loop)

  **References**:

  **Pattern References**:
  - `src/browser/connection.ts` (Task 8) — BrowserConnection class with connect/reconnect methods
  - `src/browser/protocol.ts` (Task 13) — Protocol operations that may throw CDP errors
  - `src/session/manager.ts` (Task 15) — SessionManager for emergency saves

  **API/Type References**:
  - `src/types/index.ts` (Task 3) — `AppConfig` with retry configuration fields
  - Playwright error types: `TargetClosedError`, `TimeoutError` — from playwright-core

  **External References**:
  - Exponential backoff pattern: delay = min(base * 2^attempt, maxDelay)
  - Research finding: CDP connections drop on page navigation, Chrome DevTools close, or system sleep

  **WHY Each Reference Matters**:
  - Connection module provides the reconnection capability — recovery must use its API
  - Protocol errors are the primary trigger for recovery — must handle its specific error shapes
  - Session save is critical before any throw — user must be able to resume after crash

  **Acceptance Criteria**:
  - [ ] `src/engine/recovery.ts` exists with all functions/classes exported
  - [ ] `withRetry` implements exponential backoff with configurable max retries
  - [ ] `detectRecoverableError` classifies CDP disconnect, CAPTCHA, rate limit, session expired
  - [ ] CAPTCHA and rate limit errors surfaced to user, NOT auto-retried
  - [ ] Session always saved before throwing unrecoverable errors
  - [ ] CDP reconnection attempts with 3 retries and exponential backoff

  **QA Scenarios:**

  ```
  Scenario: Retry with exponential backoff
    Tool: Bash (bun eval)
    Steps:
      1. Create a function that fails twice then succeeds
      2. Call withRetry(fn, { maxRetries: 3, baseDelayMs: 100, maxDelayMs: 1000 })
      3. Assert function was called 3 times total
      4. Assert final result is success value
      5. Assert total elapsed time >= 300ms (100 + 200 backoff)
    Expected Result: Function retried with backoff, eventually succeeds
    Evidence: .sisyphus/evidence/task-19-retry.txt

  Scenario: All retries exhausted
    Tool: Bash (bun eval)
    Steps:
      1. Create a function that always throws
      2. Call withRetry(fn, { maxRetries: 2, baseDelayMs: 50, maxDelayMs: 200 })
      3. Assert it throws after 2 retries
      4. Assert the thrown error is the original error
    Expected Result: Error thrown after exhausting retries
    Evidence: .sisyphus/evidence/task-19-exhausted.txt

  Scenario: Error classification
    Tool: Bash (bun eval)
    Steps:
      1. Call detectRecoverableError(new Error('Target closed'))
      2. Assert result.type === 'cdp_disconnect'
      3. Assert result.recoverable === true
      4. Call detectRecoverableError(new Error('unusual traffic detected'))
      5. Assert result.type === 'captcha'
      6. Assert result.recoverable === false
    Expected Result: Correct classification for each error type
    Evidence: .sisyphus/evidence/task-19-classification.txt
  ```

  **Commit**: YES (groups with Wave 5)
  - Message: `feat(engine): error recovery with retry, reconnection, and classification`
  - Files: `src/engine/recovery.ts`

 [x] 20. Unit Tests

  **What to do**:
  - Create test files in `src/tests/` using `bun test`:
    - `src/tests/parser.test.ts` — Tool call parser tests:
      - Valid JSON tool call extraction (single and multiple)
      - Malformed JSON recovery (trailing commas, unquoted keys)
      - TASK_COMPLETE signal detection
      - TASK_FAILED signal detection with reason extraction
      - Mixed reasoning + tool calls
      - Empty input (no crash)
      - Non-tool JSON blocks (should be skipped)
    - `src/tests/tools.test.ts` — Tool implementation tests:
      - read_file: existing file with line numbers, missing file error, size limit truncation
      - search_directory: matching files found, no matches returns empty, .gitignore respected
      - write_file: unified diff application, invalid diff rejection, new file creation
      - shell: basic command execution, timeout enforcement, stderr capture
    - `src/tests/config.test.ts` — Configuration tests:
      - Load from file, missing file defaults, CLI override merging, invalid JSON handling
    - `src/tests/selectors.test.ts` — Selector registry tests:
      - All selector groups have fallback arrays
      - Config override replaces specific selectors
      - trySelectors returns first match (mock)
    - `src/tests/compression.test.ts` — Context compression tests:
      - Below threshold: no compression
      - Above threshold: correct steps preserved (first 2 + last 5)
      - Memory summary extracts files modified, files read, shell commands
      - Format produces readable text
    - `src/tests/session.test.ts` — Session manager tests:
      - Save and load round-trip
      - Corrupt file handled gracefully (returns null)
      - List sorted by most recent
      - Auto-creates session directory
  - Minimum 25 test cases total across all files
  - All tests must use `bun test` — no other test runner
  - Use temp directories for file-based tests (clean up in afterEach)

  **Must NOT do**:
  - Do NOT test browser interaction (that's integration tests)
  - Do NOT mock entire modules — test real functions with controlled inputs
  - Do NOT use snapshot testing — explicit assertions only

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Many test cases across multiple modules, requires understanding each module's API
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: Unit tests don't involve browser interaction

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 21)
  - **Parallel Group**: Wave 6 (with Task 21)
  - **Blocks**: F1-F4 (final verification needs passing tests)
  - **Blocked By**: Tasks 9-12 (tools), Task 14 (parser) — must test real implementations

  **References**:

  **Pattern References**:
  - `src/engine/parser.ts` (Task 14) — parseResponse function API
  - `src/tools/*.ts` (Tasks 9-12) — All 4 tool execute() APIs
  - `src/config/loader.ts` (Task 4) — loadConfig function API
  - `src/browser/selectors.ts` (Task 5) — Selector registry API
  - `src/engine/compression.ts` (Task 17) — Compression function APIs
  - `src/session/manager.ts` (Task 15) — SessionManager class API

  **API/Type References**:
  - `bun test` docs — describe/it/expect/beforeEach/afterEach API
  - `src/types/index.ts` (Task 3) — All shared types for type-safe test inputs

  **External References**:
  - Bun test runner docs: `https://bun.sh/docs/test/writing`

  **WHY Each Reference Matters**:
  - Each module's API is the contract under test — tests must match exact function signatures
  - Shared types ensure test inputs are valid and representative

  **Acceptance Criteria**:
  - [ ] 6 test files created in `src/tests/`
  - [ ] Minimum 25 test cases total
  - [ ] `bun test` runs all tests with 0 failures
  - [ ] Parser tests cover valid, malformed, signals, and edge cases
  - [ ] Tool tests cover happy path and error paths for all 4 tools
  - [ ] Compression tests verify threshold, preservation, and summary extraction
  - [ ] Session tests verify round-trip, corruption handling, and listing

  **QA Scenarios:**

  ```
  Scenario: All unit tests pass
    Tool: Bash
    Steps:
      1. Run `bun test src/tests/parser.test.ts`
      2. Assert exit code 0, all tests pass
      3. Run `bun test src/tests/tools.test.ts`
      4. Assert exit code 0, all tests pass
      5. Run `bun test src/tests/config.test.ts`
      6. Assert exit code 0
      7. Run `bun test src/tests/compression.test.ts`
      8. Assert exit code 0
      9. Run `bun test src/tests/session.test.ts`
      10. Assert exit code 0
      11. Run `bun test` (all tests)
      12. Assert exit code 0, total >= 25 tests, 0 failures
    Expected Result: All test suites pass individually and collectively
    Evidence: .sisyphus/evidence/task-20-unit-tests.txt

  Scenario: Test coverage adequate
    Tool: Bash
    Steps:
      1. Run `bun test` and count test cases
      2. Assert parser tests >= 7 cases
      3. Assert tool tests >= 10 cases (2-3 per tool)
      4. Assert other tests >= 8 cases combined
    Expected Result: Minimum 25 test cases with good distribution
    Evidence: .sisyphus/evidence/task-20-coverage.txt
  ```

  **Commit**: YES (groups with Wave 6)
  - Message: `test: unit tests for parser, tools, config, selectors, compression, session`
  - Files: `src/tests/*.test.ts`

 [x] 21. Integration Tests

  **What to do**:
  - Create `src/tests/integration.test.ts` with:
    - `MockProtocol` class simulating Gemini responses:
      - Constructor takes array of scripted responses
      - `injectText()` records what was injected
      - `submitMessage()` no-op
      - `extractResponse()` returns next scripted response
      - `waitForCompletion()` returns true immediately
    - Integration test scenarios (minimum 5):
      1. **Full ReAct loop — read file task**:
         - Scripted responses: tool call to read_file → TASK_COMPLETE
         - Assert: file was read, result returned, session saved
      2. **Multi-step task**:
         - Scripted: read_file → write_file (diff) → TASK_COMPLETE
         - Assert: file read, diff applied, both steps in session
      3. **Error recovery in tool execution**:
         - Scripted: tool call with invalid args → observation shows error → corrected call → TASK_COMPLETE
         - Assert: error surfaced to LLM, retry succeeded
      4. **Context compression trigger**:
         - Scripted: 20+ steps with large observations (exceed 100KB threshold)
         - Assert: compression triggered, memory summary created, loop continues
      5. **Session resume**:
         - Run loop, save mid-way, create new loop from saved session
         - Assert: steps preserved, prompt preserved, loop continues from saved state
    - Real E2E test (marked `.skip` by default):
      - `describe.skip("E2E with real Gemini", ...)` — requires Chrome + Gemini
      - Connects to real Chrome, sends simple prompt, verifies full loop
      - Only run manually when Chrome is ready
  - All integration tests use real implementations (parser, tools, session, compression)
  - Only mock: protocol layer (browser interaction)

  **Must NOT do**:
  - Do NOT require real Chrome for default test run — all tests must pass without browser
  - Do NOT mock tools or parser — test real integration between modules
  - Do NOT use .only or .skip on non-E2E tests — all mock tests must run

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex multi-module integration testing requiring understanding of all component interactions
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `playwright`: Mock protocol removes need for real browser in tests

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 20)
  - **Parallel Group**: Wave 6 (with Task 20)
  - **Blocks**: F1-F4 (final verification)
  - **Blocked By**: Tasks 18, 19 (CLI and recovery — needs full system assembled)

  **References**:

  **Pattern References**:
  - `src/engine/react-loop.ts` (Task 16) — ReActLoop constructor, run() API
  - `src/browser/protocol.ts` (Task 13) — GeminiProtocol interface to mock
  - `src/engine/compression.ts` (Task 17) — shouldCompress/compress APIs
  - `src/session/manager.ts` (Task 15) — SessionManager for state verification

  **API/Type References**:
  - `src/types/index.ts` (Task 3) — All types, especially `GeminiProtocol` interface shape for mock
  - `bun test` — describe/it/expect with async support

  **External References**:
  - Mock pattern: implement interface with pre-scripted responses and call recording

  **WHY Each Reference Matters**:
  - ReActLoop is the system under test — integration tests verify it orchestrates correctly
  - Protocol interface defines what MockProtocol must implement — exact method signatures
  - Real tool/parser/session usage validates the full pipeline without browser

  **Acceptance Criteria**:
  - [ ] `src/tests/integration.test.ts` exists with MockProtocol class
  - [ ] Minimum 5 integration test scenarios (all passing without Chrome)
  - [ ] Real E2E test exists (marked `.skip`)
  - [ ] `bun test src/tests/integration.test.ts` passes with 0 failures
  - [ ] Tests use real parser, tools, session, compression (only protocol is mocked)

  **QA Scenarios:**

  ```
  Scenario: Integration tests pass without Chrome
    Tool: Bash
    Steps:
      1. Ensure no Chrome is running on port 9222
      2. Run `bun test src/tests/integration.test.ts`
      3. Assert exit code 0
      4. Assert >= 5 tests pass
      5. Assert E2E test is skipped (not failed)
    Expected Result: All mock-based integration tests pass, E2E skipped
    Evidence: .sisyphus/evidence/task-21-integration.txt

  Scenario: Full ReAct loop integration
    Tool: Bash (bun eval)
    Steps:
      1. Create MockProtocol with 2 scripted responses:
         - Response 1: tool call to read_file for a test file
         - Response 2: 'TASK_COMPLETE'
      2. Create full ReActLoop with real parser, tools, session manager
      3. Call loop.run('Read the test file')
      4. Assert result.success === true
      5. Assert result.steps.length === 2
      6. Assert session file was created
    Expected Result: Full pipeline works end-to-end with mock protocol
    Evidence: .sisyphus/evidence/task-21-full-loop.txt

  Scenario: Session resume integration
    Tool: Bash (bun eval)
    Steps:
      1. Run loop for 2 steps, then stop
      2. Verify session file saved with 2 steps
      3. Create new loop, load session
      4. Verify session state matches (prompt, step count)
    Expected Result: Session data preserved across loop instances
    Evidence: .sisyphus/evidence/task-21-resume.txt
  ```

  **Commit**: YES (groups with Wave 6)
  - Message: `test: integration tests with mock protocol and real module pipeline`
  - Files: `src/tests/integration.test.ts`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

 [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

 [x] F2. **Code Quality Review** — `unspecified-high`
  Run `bun run tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify all files follow naming conventions from `.ai/standards/code-quality.md`.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

 [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (full ReAct loop end-to-end). Test edge cases: empty project, large files, malformed LLM output, CDP disconnection. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

 [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Wave | Message | Files | Pre-commit |
|------|---------|-------|-----------|
| 0 | `feat(validation): validate CDP + Bun + stealth assumptions` | `src/validation/` | `bun run src/validation/spike.ts` |
| 1 | `feat(scaffold): project foundation, types, config, selectors` | `src/types/`, `src/config/`, `src/browser/selectors.ts`, `.ai/project/` | `bun run tsc --noEmit` |
| 2 | `feat(core): browser bridge and tool implementations` | `src/browser/`, `src/tools/` | `bun test src/tools/` |
| 3 | `feat(protocol): communication, parser, session manager` | `src/browser/protocol.ts`, `src/engine/parser.ts`, `src/session/` | `bun test` |
| 4 | `feat(engine): ReAct loop and context compression` | `src/engine/` | `bun test` |
| 5 | `feat(cli): entry point and error recovery` | `src/cli.ts`, `src/engine/recovery.ts` | `bun test` |
| 6 | `test: unit and integration tests` | `src/tests/` | `bun test` |

---

## Success Criteria

### Verification Commands
```bash
# Type check passes
bun run tsc --noEmit  # Expected: no errors

# All tests pass
bun test  # Expected: all pass, 0 failures

# CLI starts and shows help
bun run src/cli.ts --help  # Expected: shows usage info

# CDP connection check
bun run src/cli.ts --check-connection  # Expected: "Connected to Chrome via CDP. Gemini page detected."

# Full ReAct loop (requires Chrome with Gemini open)
bun run src/cli.ts --prompt "Read package.json and tell me the project name"
# Expected: Agent completes task, outputs result, exits cleanly

# Session resume
bun run src/cli.ts --prompt "List all files" --session test-session  # Ctrl+C mid-task
bun run src/cli.ts --resume test-session  # Expected: Resumes from saved state
```

### Final Checklist
- [ ] All "Must Have" items implemented and verified
- [ ] All "Must NOT Have" items absent from codebase
- [ ] All 4 tools work independently
- [ ] ReAct loop completes full cycle with real Gemini
- [ ] Session persistence works across CLI restarts
- [ ] Context compression triggers at configured threshold
- [ ] Configuration file + CLI args both work
- [ ] `bun test` passes all tests
- [ ] `.ai/project/tech-stack.md` updated with actual stack
