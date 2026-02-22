// src/engine/compression.ts
// Mechanical context compression — no LLM calls

import type { AgentConfig, CompressedContext, MemorySummary, ReActStep } from '../types/index.js';

const DEFAULT_COMPRESSION_THRESHOLD = 102400; // 100KB
const KEEP_FIRST = 2;
const KEEP_LAST = 5;
const MAX_GOAL_LENGTH = 500;
const MAX_SHELL_COMMANDS = 10;
const MAX_ERRORS = 5;

/**
 * Returns true when total text size of steps exceeds threshold.
 */
export function shouldCompress(steps: ReActStep[], config: AgentConfig): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const threshold = ((config as any).compressionThresholdBytes as number) ?? DEFAULT_COMPRESSION_THRESHOLD;
  const totalSize = steps.reduce((sum, step) => sum + step.thought.length + step.observation.output.length, 0);
  return totalSize > threshold;
}

/**
 * Keeps first 2 + last 5 steps, strips middle into a memory summary.
 */
export function compress(steps: ReActStep[], config: AgentConfig): CompressedContext {
  // Avoid unused-parameter error while keeping the signature
  void config;

  if (steps.length <= KEEP_FIRST + KEEP_LAST) {
    return {
      preservedSteps: steps,
      memorySummary: buildMemorySummary([]),
    };
  }

  const first = steps.slice(0, KEEP_FIRST);
  const last = steps.slice(-KEEP_LAST);
  const middle = steps.slice(KEEP_FIRST, steps.length - KEEP_LAST);

  return {
    preservedSteps: [...first, ...last],
    memorySummary: buildMemorySummary(middle),
  };
}

/**
 * Mechanically extracts structured info from stripped steps.
 */
export function buildMemorySummary(steps: ReActStep[]): MemorySummary {
  const filesModified = new Set<string>();
  const filesRead = new Set<string>();
  const shellCommands: string[] = [];
  const keyDecisions: string[] = [];
  const errors: string[] = [];

  for (const step of steps) {
    const { action, observation, thought } = step;

    // Extract files modified (edit_file tool)
    if (action.tool === 'edit_file' && typeof action.args.path === 'string') {
      filesModified.add(action.args.path);
    }

    // Extract files read (read_file tool)
    if (action.tool === 'read_file' && typeof action.args.path === 'string') {
      filesRead.add(action.args.path);
    }

    // Extract shell commands
    if (action.tool === 'shell' && typeof action.args.command === 'string') {
      shellCommands.push(action.args.command);
    }

    // Extract key decisions from reasoning (heuristic, case-insensitive)
    const lines = thought.split('\n');
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('decision:') || lower.includes('chose') || lower.includes('because')) {
        keyDecisions.push(line.trim());
      }
    }

    // Collect errors
    if (!observation.success) {
      const msg = observation.error ?? observation.output;
      errors.push(`[${action.tool}] ${msg.slice(0, 200)}`);
    }
  }

  // Build combined keyDecisions array (decisions + filesRead + shellCommands + errors)
  const combined: string[] = [...keyDecisions];

  if (filesRead.size > 0) {
    combined.push(`Files read: ${[...filesRead].join(', ')}`);
  }

  const recentShell = shellCommands.slice(-MAX_SHELL_COMMANDS);
  if (recentShell.length > 0) {
    combined.push(`Shell commands: ${recentShell.join('; ')}`);
  }

  const recentErrors = errors.slice(-MAX_ERRORS);
  if (recentErrors.length > 0) {
    combined.push(`Errors: ${recentErrors.join(' | ')}`);
  }

  // Goal from first step's thought (if any steps provided)
  const goal = steps.length > 0 ? steps[0].thought.slice(0, MAX_GOAL_LENGTH) : '';

  // currentStep from last step
  const currentStep =
    steps.length > 0
      ? `Step at ${steps[steps.length - 1].action.tool}: ${steps[steps.length - 1].thought.slice(0, 200)}`
      : '';

  return {
    goal,
    filesModified: [...filesModified],
    keyDecisions: combined,
    currentStep,
  };
}

/**
 * Renders a structured text summary for context injection.
 */
export function formatMemoryForInjection(memory: MemorySummary): string {
  const filesStr = memory.filesModified.length > 0 ? memory.filesModified.join(', ') : 'none';
  const decisionsStr = memory.keyDecisions.length > 0 ? memory.keyDecisions.join('\n') : 'none';

  return [
    '[Context Compression — Previous conversation summarized]',
    `Goal: ${memory.goal}`,
    `Files Modified: ${filesStr}`,
    `Key Decisions: ${decisionsStr}`,
    `Current Step: ${memory.currentStep}`,
    '[End Summary]',
  ].join('\n');
}
