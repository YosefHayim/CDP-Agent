# Gemini CLI Integration

> **Gemini CLI-specific features** - Sessions, headless mode, Google Search.

---

## Auto-Loaded Files

Gemini CLI automatically loads:
- `GEMINI.md` (root)
- `AGENTS.md` (root)

These files reference the `.ai/` hierarchical structure.

---

## MCP Configuration

Configure in `~/.gemini/settings.json` (global) or `.gemini/settings.json` (project):

```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "npx",
      "args": ["-y", "task-master-ai"]
    }
  }
}
```

**Note**: API keys are configured via `task-master models --setup`, not in MCP configuration.

---

## Session Management

Built-in session commands:

| Command | Purpose |
|---------|---------|
| `/chat` | Start new conversation while keeping context |
| `/checkpoint save <name>` | Save session state |
| `/checkpoint load <name>` | Resume saved session |
| `/memory show` | View loaded context |
| `/stats` | View token usage and costs |

---

## Headless Mode

Non-interactive mode for scripts:

```bash
# Simple text response
gemini -p "What's the next task?"

# JSON output for parsing
gemini -p "List all pending tasks" --output-format json

# Stream events for long operations
gemini -p "Expand all tasks" --output-format stream-json
```

---

## Google Search Grounding

Gemini CLI has built-in Google Search. Use it for:
- Best practices research
- Library documentation
- Security vulnerability checks
- Implementation patterns

Alternative to Perplexity research mode.

---

## Recommended Model Configuration

```bash
# Set Gemini as primary model
task-master models --set-main gemini-2.0-flash-exp
task-master models --set-fallback gemini-1.5-flash

# Optional: Use Perplexity for research
task-master models --set-research perplexity-llama-3.1-sonar-large-128k-online
```

---

## Important Differences

| Feature | Gemini CLI | Other Tools |
|---------|------------|-------------|
| Custom slash commands | No | Yes (Claude Code) |
| Tool allowlist | No (MCP-level security) | Yes |
| Session persistence | Via `/checkpoint` | Varies |
| Config file | `.gemini/settings.json` | `.mcp.json` |

---

## MCP Tools

Same tools as Claude Code:

```javascript
get_tasks          // View all tasks
next_task          // Get next task
get_task           // Show task details
set_task_status    // Mark complete
expand_task        // Break into subtasks
update_subtask     // Log progress
```

---

## Best Practices

1. **Use `/checkpoint`** - Save state after significant progress
2. **Monitor `/stats`** - Track token usage in long sessions
3. **Leverage Google Search** - Built-in research capability
4. **Use MCP tools naturally** - They integrate transparently
5. **Follow `.ai/` structure** - Same standards as other tools

---

[Back to Tools](./index.md) | [Back to Index](../index.md)
