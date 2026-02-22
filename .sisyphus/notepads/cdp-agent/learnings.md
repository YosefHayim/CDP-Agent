# Learnings — cdp-agent

## [2026-02-22] Session Start
- Runtime: Bun (native TS, fast installs, built-in test runner)
- Package manager: bun (bun add, bun run, bun test)
- tsconfig: ES2022, strict, src/ → dist/, @/* alias
- Current package.json only has `glob` dep — all playwright deps need adding

## Critical DOM Guardrails (from research)
- Gemini input: `.ql-editor[contenteditable="true"]` — Quill editor
- NEVER use page.type() or page.fill() on Quill — use clipboard paste or execCommand('insertText')
- Gemini responses: `message-content` elements
- Thinking content: `model-thoughts`, `.thoughts-container`, `.thoughts-content` — MUST be excluded
- Thinking content appears BEFORE response in DOM order — naive querySelector grabs wrong element
- Use queryOutsideThoughts pattern (from gemini-voyager)

## CDP Pattern (confirmed from 12+ open-source projects)
- chromium.use(StealthPlugin()); chromium.connectOverCDP(url)
- Discover WS URL from http://localhost:9222/json/version → webSocketDebuggerUrl
- Projects using this: karakeep, promptfoo, FellouAI/eko, norish, openclaw

## Streaming Detection
- Dual-signal: content stability polling (text unchanged for N polls) + stop-button disappearance
- No native DOM signal for streaming completion

## Selector Strategy
- ALWAYS use ordered fallback arrays, never single selectors
- Dedicated selector registry with config override capability


## [2026-02-22] Task 1: Validation Spike Results
 CHECK 1: SKIPPED — Chrome not running on port 9222
 CHECK 2: SKIPPED — No CDP endpoint available
 CHECK 3: SKIPPED — No browser connection
 CHECK 4: SKIPPED — No Gemini page available
 CHECK 5: SKIPPED — No response to extract
 CHECK 6: SKIPPED — No streaming to detect
 Dependencies installed: playwright-extra@4.3.6, puppeteer-extra-plugin-stealth@2.11.2, playwright-core@1.58.2
 spike.ts created with all 6 checks, ready to run when Chrome is launched
 Editor selector fallback array: `.ql-editor[contenteditable="true"]`, `rich-textarea [contenteditable]`, `[data-testid="chat-input"]`
 Input method: `document.execCommand('insertText', ...)` — avoids Quill breakage from page.type/page.fill
 Response extraction: `message-content` elements filtered by NOT inside `model-thoughts`/`.thoughts-container`/`.thoughts-content`
 Streaming detection: dual-signal (3x 500ms stable polls + stop button disappearance)
 To validate: `google-chrome --remote-debugging-port=9222` then open gemini.google.com, then `bun run src/validation/spike.ts`

## [2026-02-22] Task 3: Types Complete
 All 13 interfaces defined in src/types/index.ts
 BrowserConnection uses playwright-core Browser and Page types (imported via type-only syntax)
 AgentConfig includes all config fields including optional selectors override
 Types file compiles cleanly with no errors
 Commit: feat(types): core type definitions for all system layers

## [2026-02-22] Task 2: Scaffolding Complete
 Directory structure: src/{browser,config,engine,prompts,session,tools,types,tests,utils}
 Dependencies added: diff@8.0.3, fast-glob@3.3.3, chalk@5.6.2, ora@9.3.0, commander@14.0.3
 Dev dependencies: @types/diff@8.0.0, @types/node@25.3.0
 Config template: .cdp-agent.config.json at project root with all 10 config fields
 package.json: added name, bin entry (cdp-agent → ./src/cli.ts), scripts (start, dev, build, test, typecheck)
 tsconfig.json verified: rootDir=./src, strict=true, include=[src/**/*], @/* alias configured
 All new files compile cleanly (spike.ts errors are pre-existing from Task 1)
 Commit: feat(scaffold): project structure, dependencies, config template

## [2026-02-22] Task 5: Selector Registry Complete
 6 Gemini selector chains defined: INPUT, SEND_BUTTON, RESPONSE, THINKING, STOP_BUTTON, LOADING
 findElement() tries each selector in order, returns first match
 waitForElement() polls with timeout, throws descriptive error
 healthCheck() tests all chains, returns pass/fail per chain
 extractResponseText() implements queryOutsideThoughts pattern
 applyConfigOverrides() allows config file to override selectors


## [2026-02-22] Task 4: Config System Complete
 3-source merge: defaults → .cdp-agent.config.json → CLI args
 commander used for CLI parsing
 AgentConfig interface defined in src/config/loader.ts (mirrors src/types/index.ts)
 loadConfig() is the main entry point
 tsconfig uses NodeNext module resolution — imports require .js extensions


## [2026-02-22] Task 6: System Prompt Complete
 buildSystemPrompt() takes { task, workingDirectory, projectContext? }
 Format: THOUGHT: → json code block → OBSERVATION: → repeat → TASK_COMPLETE:
 4 tools: read_file, search_directory, edit_file, shell
 formatObservation() wraps ToolResult as OBSERVATION: text
 formatMemorySummary() formats compressed memory for context injection
 Module uses NodeNext resolution (.js extensions in barrel imports)


## [2026-02-22] Task 9: Read File Tool Complete
 createReadFileTool(workingDirectory, fileReadMaxSize) factory function
 validatePath() prevents path traversal (../../etc/passwd)
 isBinary() detects null bytes to reject binary files
 addLineNumbers() pads line numbers to consistent width
 Truncates at fileReadMaxSize with informative message
 Uses Bun.file() for efficient reading
 IMPORTANT: .js extensions required in imports for NodeNext
 tsconfig.json: added "bun" to types array for Bun type definitions
 @types/bun@1.3.9 installed for Bun.file() type support

## [2026-02-22] Task 10: Search Directory Tool Complete
 createSearchDirectoryTool(workingDirectory) factory function
 Uses fast-glob with DEFAULT_IGNORE (node_modules, .git, dist, build, .next, .nuxt, coverage, .cache)
 Reads .gitignore from workingDirectory and converts patterns to fast-glob format
 Returns paths relative to workingDirectory
 Limits to 200 results with count message
 IMPORTANT: .js extensions required in imports for NodeNext
 Tested: **/*.ts pattern in src/ returns 15 files correctly
 Commit: feat(tools): search directory tool with gitignore support

## [2026-02-22] Task 12: Shell Tool Complete
 createShellTool(workingDirectory, shellTimeout) factory function
 Uses Bun.spawn(['sh', '-c', command]) for shell execution
 setTimeout + proc.kill() for timeout enforcement
 Captures stdout and stderr separately, formats as STDOUT:/STDERR:/EXIT CODE:
 Truncates output at 100KB
 Returns success: false when exit code != 0
 IMPORTANT: .js extensions required in imports for NodeNext
 Tested: echo command returns success: true with proper output formatting
 Commit: feat(tools): shell execution tool with timeout

## [2026-02-22] Task 8: Browser Bridge Complete
 BrowserBridge class in src/browser/index.ts
 discoverEndpoint() fetches wsUrl from http://localhost:{port}/json/version
 connect() initializes stealth once (singleton pattern), connects via CDP
 findGeminiPage() searches all contexts/pages for gemini.google.com URL
 disconnect() uses browser.close() (not disconnect()) to end CDP session
 runHealthCheck() logs selector health on connect
 browser.on('disconnected') updates connection.connected flag
 IMPORTANT: .js extensions required in imports for NodeNext module resolution
 BrowserConnection interface defined in connection.ts (also exists in types/index.ts)


## [2026-02-22] Task 11: Edit File Tool Complete
 createEditFileTool(workingDirectory) factory function
 Uses jsdiff applyPatch() for unified diff application
 atomicWrite() uses temp file + rename for corruption safety
 validatePath() prevents path traversal
 If diff is not unified format, treats as raw content (new file creation)
 Returns descriptive error when patch fails (context mismatch)
 IMPORTANT: .js extensions required in imports for NodeNext

## [2026-02-22] Task 7: Parser Complete
 parseResponse() extracts reasoning (text before first json block), tool calls, and signals
 JSON recovery: strips trailing commas then retries JSON.parse()
 Multiple json blocks supported - each validated against ToolCall shape (tool: string, args: object)
 Signal detection: TASK_COMPLETE and TASK_FAILED case-insensitive regex on full text
 TASK_FAILED reason extracted from text after colon/dash separator up to newline
 Never throws on malformed input - returns empty toolCalls with raw text preserved
 ParseResult defined locally in parser.ts (different shape from types/index.ts ParseResult)
 Regex with /g flag needs lastIndex = 0 reset before exec loop (subtle stateful gotcha)
 Commit: feat(engine): tool call parser with JSON recovery and signal detection

## Session Manager (manager.ts)
 Local `SessionState` type defined in manager.ts (not types/index.ts) to avoid field conflicts with existing type
 `Bun.write()` for file writes, `rename()` from `node:fs/promises` for atomic rename
 `isValidSession` type guard checks `id`, `steps`, `createdAt` — minimal required fields
 `.corrupt` suffix rename uses `.catch(() => {})` to avoid throwing if rename itself fails
 `list()` reads directory then loads each file individually — skips corrupt files silently

## protocol.ts learnings (2026-02-22)
 `ElementHandle.evaluate()` callback receives `Node` (not `Element`) — cast to `HTMLButtonElement` etc. for DOM methods
 `page.evaluate` with clipboard API needs `async` callback since `navigator.clipboard.writeText()` returns Promise
 For Quill editor injection: pass `GEMINI_INPUT.selectors` array INTO `page.evaluate` to avoid hardcoding selectors in browser context
 `Pick<AgentConfig, ...>` is cleaner than accepting full AgentConfig for functions that only need specific fields
 `document.execCommand('insertText')` is deprecated but still works and is the correct fallback for Quill contenteditable injection
 TSC passes fine with `??` on non-optional `number` fields — no error, just technically redundant (removed for cleanliness)

## compression.ts (2026-02-22)
 `AgentConfig` cannot be cast to `Record<string, unknown>` directly — use `as any` for accessing non-existent fields like `compressionThresholdBytes`
 `MemorySummary` has only 4 fields: `goal`, `filesModified`, `keyDecisions`, `currentStep` — pack extra info (filesRead, shellCommands, errors) into `keyDecisions`
 `void config;` pattern suppresses `noUnusedParameters` error while keeping the parameter in the signature


## [2026-02-22] Task 13: ReAct Loop Complete
 ReActLoop class in src/engine/react-loop.ts with run() method
 ReActResult interface defined locally (success, steps, sessionId, finalResponse, reason?)
 Constructor takes page, protocol (typeof GeminiProtocol), parser (typeof parseResponse), sessionManager, tools Map, config
 page: Page required as first constructor param — protocol functions all need it
 typeof GeminiProtocol and typeof parseResponse need VALUE imports (not import type) for typeof to work
 noUnusedLocals: true counts typeof X in type position as a use of the value — no false warnings
 SessionState from session/manager.ts used (not types/index.ts) — different fields (prompt, createdAt, lastStepAt vs status, memory, messages)
 Parse failure and empty response tracked with separate counters: consecutiveParseFailures (aborts at maxParseFailures), consecutiveEmpty (nudges at 3)
 compression.ts doesn't exist yet — skipped gracefully per task spec
 Session saved after EVERY loop iteration and on all exit paths (signals, abort, max iterations)
 Commit: feat(engine): ReAct loop with tool registry and session persistence

## Recovery Module (recovery.ts)
 `BrowserBridge.connect()` takes NO args (config stored internally), returns `BrowserConnection`
 `BrowserBridge` has no `getBrowser()` or `findGeminiPage()` methods — use `connect()` which does both
 `SessionState` in `session/manager.ts` differs from `SessionState` in `types/index.ts` — recovery uses the manager version
 Only CDP disconnect errors (`target closed`, `session closed`, etc.) are auto-recoverable
 CAPTCHA, rate limit, session expired are surfaced to user (not auto-retried)
 Emergency session save before throwing non-recoverable errors — critical safety invariant

## CLI Entry Point (src/cli.ts) — Task 18
 commander `program.opts<T>()` generic gives typed opts without separate parsing
 cli-args.ts `parseCliArgs()` exists but cli.ts defines its own Commander for `--cdp-port` and `--list-sessions` flags not in CliArgs
 Tool wrapping pattern: wrap each Tool's execute() to stop spinner → run → print step → restart spinner. Gives per-step output without modifying ReActLoop
 `process.exit()` returns `never` — TypeScript narrowing handles definite assignment correctly through if-else chains ending in process.exit()
 `process.exitCode = 1` (vs `process.exit(1)`) allows finally blocks to run for cleanup (disconnect)
 `ReturnType<typeof ora>` gives the `Ora` type without needing to import it from ora internals
 SIGINT handler: ReActLoop already saves after each step, so session is mostly saved; handler just prints resume command
 BrowserBridge.connect() internally calls findGeminiPage — successful connect already verifies Gemini tab


## [2026-02-22] Integration Tests Complete
  MockProtocol class: same shape as GeminiProtocol object (injectText, submitMessage, extractResponse, waitForCompletion)
  Cast mock via `mock as unknown as typeof GeminiProtocol` — tsconfig excludes src/tests so no strict type issues
  fakePage: `null as unknown as Page` — MockProtocol ignores the page param entirely
  Temp dir with seeded package.json for read_file tests — keeps tests self-contained
  6 passing tests + 1 skipped E2E: full loop, maxIterations cap, parse failure abort, TASK_FAILED, session persistence, unknown tool error
  bun test runs clean: 6 pass, 1 skip, 0 fail, 193ms
  Commit: test: integration tests with mock protocol and real module pipeline

## Unit Tests (Task 14)
 Shell timeout test (`sleep 10` with 100ms timeout): bun test default timeout is 5000ms, but the shell kill+cleanup takes >5s. Must set per-test timeout: `it('...', async () => {...}, 15000)`
 `loadConfig` with invalid JSON logs `console.error` as expected behavior — test still passes since it falls back to defaults
 Test files excluded from tsconfig.json `exclude` array, so TS strictness doesn't block test runs
 `src/tests/index.ts` counts as 1 skipped test file (empty file) — harmless
 `applyConfigOverrides` mutates shared module state — must restore original selectors after test to avoid pollution