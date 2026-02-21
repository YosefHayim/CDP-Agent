---
description: Mandatory progress tracking after every task completion
globs: "**/*"
alwaysApply: true
---

- **MANDATORY: Update `progress-project.md` after EVERY task**
  - This file is the **single source of truth** for project state
  - Updates are required after completing ANY task (no exceptions)
  - See `AGENTS.md` for the full Progress Tracking Protocol

- **Before Starting Work:**
  - Read `progress-project.md` to understand current project state
  - Check "In Progress" section to avoid duplicate work
  - Update "In Progress" section with what you're starting

- **After Completing Work:**
  - Update "Completed Work" section with date and task description
  - Update "Current Features" if a new feature was added
  - Clear the task from "In Progress" section
  - Update "Session Notes" for context handoff
  - Update other sections as applicable (issues, decisions, structure)

- **Update Format:**
  ```markdown
  ### YYYY-MM-DD

  - [x] Task description - Brief notes on implementation
  ```

- **Enforcement:**
  - This is NOT optional - all agents must comply
  - No task is too small to log
  - When in doubt, update the file
