import type { MemorySummary, ToolResult } from '../types/index.js';

export function formatObservation(result: ToolResult): string {
  if (result.success) {
    return `OBSERVATION: ${result.output}`;
  }
  return `OBSERVATION: ERROR — ${result.error ?? result.output}`;
}

export function formatInitialContext(args: { task: string; workingDirectory: string; sessionId: string }): string {
  return [`SESSION: ${args.sessionId}`, `TASK: ${args.task}`, `WORKING_DIR: ${args.workingDirectory}`].join('\n');
}

export function formatMemorySummary(memory: MemorySummary): string {
  const lines = [
    '=== MEMORY SUMMARY (context compressed) ===',
    `Goal: ${memory.goal}`,
    `Current step: ${memory.currentStep}`,
  ];

  if (memory.filesModified.length > 0) {
    lines.push(`Files modified: ${memory.filesModified.join(', ')}`);
  }

  if (memory.keyDecisions.length > 0) {
    lines.push('Key decisions:');
    for (const d of memory.keyDecisions) lines.push(`  - ${d}`);
  }

  lines.push('=== END MEMORY SUMMARY ===');
  return lines.join('\n');
}
