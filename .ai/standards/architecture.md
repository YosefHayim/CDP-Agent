# Architecture

## Project Type
CLI tool — autonomous code agent via Chrome DevTools Protocol

## Directory Structure

```
src/
├── browser/          # CDP connection, stealth, DOM interaction
│   ├── connection.ts # CDP connect/disconnect, page discovery
│   ├── selectors.ts  # Resilient DOM selector registry
│   └── index.ts      # BrowserBridge class
├── config/           # Configuration loading, CLI arg parsing
│   ├── schema.ts     # Default config values
│   ├── loader.ts     # 3-source merge (defaults → file → CLI)
│   ├── cli-args.ts   # Commander CLI argument parser
│   └── index.ts      # loadConfig() barrel export
├── engine/           # ReAct loop, context compression
│   ├── react-loop.ts # Main ReAct loop orchestrator
│   ├── compression.ts # Context compression
│   └── index.ts
├── prompts/          # System prompt templates
│   ├── system-prompt.ts    # buildSystemPrompt() template
│   ├── observation-format.ts # formatObservation() etc.
│   └── index.ts
├── session/          # Session persistence, atomic writes
│   ├── manager.ts    # Save/load/resume sessions
│   └── index.ts
├── tools/            # Local tool implementations
│   ├── read-file.ts  # Read file with line numbers
│   ├── search-directory.ts # Glob search
│   ├── edit-file.ts  # Unified diff application
│   ├── shell.ts      # Shell command execution
│   └── index.ts
├── types/            # TypeScript interfaces
│   └── index.ts      # All core types
├── utils/            # Shared utilities
│   └── index.ts
├── tests/            # Unit and integration tests
└── cli.ts            # CLI entry point
```

## Data Flow
1. User runs: `bun run src/cli.ts --prompt "task"`
2. CLI parses args → loads config → connects to Chrome via CDP
3. Finds Gemini tab → injects system prompt via Quill editor
4. ReAct loop: extract response → parse tool call → execute → format observation → inject
5. Loop until TASK_COMPLETE or max iterations
6. Session saved atomically to .cdp-agent-sessions/

## Key Patterns
- Selector fallback chains (never single selectors)
- Atomic writes for session persistence
- Thinking content exclusion from response extraction
- Dual-signal streaming detection (stability + stop button)

## Key Files Reference

| File | Purpose | When to Check |
|------|---------|---------------|
| `.ai/index.md` | AI instruction navigation | Starting any task |
| `.ai/project/tech-stack.md` | Technology choices | Before adding dependencies |
| `src/types/index.ts` | Shared TypeScript types | Before defining new types |
| `src/tools/index.ts` | Tool implementations | Before adding new tools |
| `src/browser/selectors.ts` | DOM selector registry | Before adding new selectors |
| `package.json` | Dependencies & scripts | Before adding packages |

## Configuration Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript configuration |
| `bunfig.toml` | Bun runtime configuration |
| `.cdp-agent.json` | Agent runtime configuration |

## Import Aliases

```json
{
  "@/*": ["./src/*"]
}
```

## AI-Specific Directories

| Directory | Purpose | Tool Support |
|-----------|---------|--------------|
| `.ai/` | Hierarchical instruction book | All AI tools |
| `.taskmaster/` | Task Master configuration | Task Master AI |
| `.cursor/` | Cursor-specific rules | Cursor |
| `.clinerules/` | Cline-specific rules | Cline |
| `.sisyphus/` | Sisyphus orchestration plans | Sisyphus |

---

[Back to Standards](./index.md) | [Back to Index](../index.md)
