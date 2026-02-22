# Decisions — cdp-agent

## [2026-02-22] Architecture Decisions
- Tool call format: JSON in fenced code blocks (```json ... ```)
- Context overflow: Mechanical compression — keep first 2 + last 5 steps + MemorySummary
- Session persistence: Atomic writes (temp → rename), corruption recovery
- Shell timeout: configurable, default 120s
- File read cap: configurable, default 100KB
- File write/edit: scoped to working directory
- Max ReAct iterations: configurable, default 50
- Max consecutive parse failures: configurable, default 3
- Config file: .cdp-agent.config.json + CLI arg overrides
