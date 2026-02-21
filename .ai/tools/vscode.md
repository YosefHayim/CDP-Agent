# VS Code / GitHub Copilot Integration

> **VS Code-specific features** - GitHub Copilot instructions.

---

## Auto-Loaded Files

GitHub Copilot in VS Code loads instructions from:
- `.github/instructions/*.instructions.md`

Files use the `.instructions.md` extension.

---

## Instruction Format

```markdown
<!-- .github/instructions/example.instructions.md -->

# Instruction Title

## Match Pattern

Apply to files matching: `src/**/*.ts`

## Guidelines

- Key point 1
- Key point 2

## Examples

### Good
```typescript
// Good example
```

### Bad
```typescript
// Bad example
```
```

---

## Project Structure

```
.github/
└── instructions/
    ├── _loader.instructions.md  # Points to .ai/
    └── (other instructions)      # Specific guidelines
```

### Loader Instruction

```markdown
<!-- .github/instructions/_loader.instructions.md -->

# AI Instructions

This project uses a hierarchical instruction structure in `.ai/`.

## Before Writing Code

1. Check `.ai/standards/code-quality.md` - Search before creating
2. Follow `.ai/patterns/` for implementation
3. Track work with Task Master (see `.ai/workflows/task-management.md`)

## Key Resources

- Standards: `.ai/standards/`
- Patterns: `.ai/patterns/`
- Workflows: `.ai/workflows/`
```

---

## Copilot Features

### Copilot Chat

Use in the sidebar for:
- Code explanations
- Refactoring suggestions
- Test generation
- Documentation help

### Inline Suggestions

Enable/disable with:
- `Ctrl+Alt+/` (toggle)
- Tab to accept
- Esc to dismiss

### Copilot for CLI

In the integrated terminal:
```bash
# Get command suggestions
gh copilot suggest "find all TypeScript files with TODO comments"

# Explain a command
gh copilot explain "find . -name '*.ts' -exec grep -l 'TODO' {} \;"
```

---

## Workspace Settings

Configure in `.vscode/settings.json`:

```json
{
  "github.copilot.enable": {
    "*": true,
    "yaml": false,
    "markdown": true
  },
  "github.copilot.inlineSuggest.enable": true
}
```

---

## No MCP Support

GitHub Copilot does not support MCP tools natively. For Task Master integration:
- Use CLI commands: `task-master list`, `task-master next`, etc.
- Or use a different AI tool that supports MCP

---

## Best Practices

1. **Use instruction files** - Guide Copilot with project-specific patterns
2. **Reference .ai/ structure** - Keep instructions pointing to central docs
3. **Be specific** - Detailed prompts get better suggestions
4. **Review suggestions** - Don't blindly accept
5. **Combine with Chat** - Use chat for complex questions

---

## Copilot Limitations

| Limitation | Workaround |
|------------|------------|
| No MCP tools | Use CLI commands |
| No custom commands | Use snippets instead |
| Limited context | Be explicit in prompts |
| No session persistence | Use Copilot Chat for context |

---

[Back to Tools](./index.md) | [Back to Index](../index.md)
