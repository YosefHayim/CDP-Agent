# Git Conventions

> **Commit messages, branch naming, and PR workflow** - Keep history clean and meaningful.

---

## Commit Message Format

```
<type>(<scope>): <description> (#task-id)

[optional body]

[optional footer]
```

### Examples

```bash
# Feature
feat(auth): add OAuth2 login with Google (#1.2)

# Bug fix
fix(api): handle null response in user service (#2.1)

# Refactor
refactor(components): extract Card base component (#3.4)

Extracted common card styling into reusable Card component.
Updated UserCard and ProductCard to use new base.

BREAKING CHANGE: Card now requires 'variant' prop
```

---

## Commit Types

| Type | When to Use | Example |
|------|-------------|---------|
| `feat` | New feature for users | `feat(cart): add quantity selector` |
| `fix` | Bug fix for users | `fix(checkout): correct tax calculation` |
| `docs` | Documentation only | `docs(readme): update installation steps` |
| `style` | Formatting, no code change | `style(lint): fix trailing whitespace` |
| `refactor` | Code change, no feature/fix | `refactor(utils): simplify date formatting` |
| `perf` | Performance improvement | `perf(images): add lazy loading` |
| `test` | Adding/updating tests | `test(auth): add login failure cases` |
| `chore` | Maintenance, deps | `chore(deps): update React to v19` |
| `ci` | CI/CD changes | `ci(github): add Node 20 to matrix` |
| `build` | Build system changes | `build(vite): optimize chunk splitting` |

---

## Scope Guidelines

Scope should indicate the area of change:

| Scope | Use For |
|-------|---------|
| `auth` | Authentication/authorization |
| `api` | API routes, endpoints |
| `ui` | UI components, styling |
| `db` | Database, migrations |
| `config` | Configuration files |
| `deps` | Dependencies |
| Component name | Specific component changes |

---

## Branch Naming

```
<type>/<task-id>-<short-description>
```

### Examples

```
feat/1.2-oauth-login
fix/2.1-null-response
refactor/3.4-card-component
docs/4.1-api-documentation
```

### Branch Types

| Prefix | Purpose |
|--------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `refactor/` | Code refactoring |
| `docs/` | Documentation |
| `test/` | Test additions |
| `chore/` | Maintenance |
| `hotfix/` | Urgent production fixes |

---

## Pull Request Workflow

### Creating a PR

```bash
# Ensure branch is up to date
git fetch origin
git rebase origin/main

# Push branch
git push -u origin feat/1.2-oauth-login

# Create PR (using GitHub CLI)
gh pr create --title "feat(auth): add OAuth2 login with Google" --body "
## Summary
- Adds Google OAuth2 authentication
- Implements session management
- Adds login/logout UI components

## Task Reference
Closes #1.2

## Testing
- [x] Manual testing completed
- [x] Unit tests added
- [x] E2E tests passing

## Screenshots
[If applicable]
"
```

### PR Title Format

Same as commit message format:
```
<type>(<scope>): <description>
```

### PR Description Template

```markdown
## Summary
Brief description of changes (2-3 sentences)

## Task Reference
Closes #<task-id>

## Changes
- Change 1
- Change 2
- Change 3

## Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Screenshots
[If UI changes]

## Notes for Reviewers
[Any context that helps review]
```

---

## Git Workflow

### Feature Development

```bash
# Start from main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feat/1.2-oauth-login

# Make changes and commit
git add .
git commit -m "feat(auth): add OAuth2 login with Google (#1.2)"

# Push and create PR
git push -u origin feat/1.2-oauth-login
gh pr create
```

### Keeping Branch Updated

```bash
# Rebase on main (preferred)
git fetch origin
git rebase origin/main

# If conflicts, resolve then continue
git add .
git rebase --continue

# Force push (only on feature branches!)
git push --force-with-lease
```

### Squashing Commits

Before merging, squash related commits:

```bash
# Interactive rebase to squash
git rebase -i HEAD~3  # Last 3 commits

# In editor, mark commits to squash
pick abc123 feat(auth): initial OAuth setup
squash def456 fix typo
squash ghi789 add missing test

# Save and edit final commit message
```

---

## Commit Best Practices

### DO

- Write clear, descriptive messages
- Reference task IDs in commits
- Keep commits focused (one logical change)
- Use present tense ("add" not "added")
- Capitalize first letter after type

### DON'T

- Use vague messages ("fix stuff", "WIP", "updates")
- Mix unrelated changes in one commit
- Commit broken code to main
- Force push to shared branches
- Commit sensitive data (API keys, passwords)

---

## Protected Branches

| Branch | Rules |
|--------|-------|
| `main` | Require PR, require reviews, no force push |
| `develop` | Require PR, no force push |
| `release/*` | Require PR, require reviews |

---

## Useful Git Commands

```bash
# View recent commits
git log --oneline -10

# View changes before committing
git diff --staged

# Amend last commit message
git commit --amend -m "new message"

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Stash changes temporarily
git stash
git stash pop

# Cherry-pick specific commit
git cherry-pick <commit-hash>

# View branch graph
git log --graph --oneline --all
```

---

## Handling Mistakes

### Wrong Commit Message

```bash
# If not pushed yet
git commit --amend -m "correct message"

# If already pushed (careful!)
git commit --amend -m "correct message"
git push --force-with-lease
```

### Committed to Wrong Branch

```bash
# Create correct branch with commit
git branch correct-branch

# Reset current branch
git reset --hard HEAD~1

# Switch and continue
git checkout correct-branch
```

### Need to Revert a Commit

```bash
# Create revert commit
git revert <commit-hash>

# Or for multiple commits
git revert <oldest-hash>..<newest-hash>
```

---

[Back to Workflows](./index.md) | [Back to Index](../index.md)
