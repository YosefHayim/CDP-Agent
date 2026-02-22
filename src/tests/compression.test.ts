import { describe, expect, it } from 'bun:test';
import { buildMemorySummary, compress, formatMemoryForInjection, shouldCompress } from '../engine/compression.js';
import type { AgentConfig, ReActStep } from '../types/index.js';

function makeStep(overrides: Partial<ReActStep> = {}): ReActStep {
  return {
    thought: overrides.thought ?? 'thinking',
    action: overrides.action ?? { tool: 'shell', args: { command: 'ls' } },
    observation: overrides.observation ?? { success: true, output: 'ok' },
    timestamp: overrides.timestamp ?? Date.now(),
  };
}

const lowThresholdConfig = {
  compressionThresholdBytes: 50,
} as unknown as AgentConfig;

const highThresholdConfig = {
  compressionThresholdBytes: 999999,
} as unknown as AgentConfig;

describe('shouldCompress', () => {
  it('returns false when under threshold', () => {
    const steps = [makeStep({ thought: 'hi', observation: { success: true, output: 'ok' } })];
    expect(shouldCompress(steps, highThresholdConfig)).toBe(false);
  });

  it('returns true when over threshold', () => {
    const bigText = 'x'.repeat(100);
    const steps = [makeStep({ thought: bigText, observation: { success: true, output: bigText } })];
    expect(shouldCompress(steps, lowThresholdConfig)).toBe(true);
  });
});

describe('compress', () => {
  it('preserves first 2 + last 5 steps when enough steps exist', () => {
    const steps = Array.from({ length: 10 }, (_, i) => makeStep({ thought: `step ${i}` }));
    const result = compress(steps, lowThresholdConfig);
    expect(result.preservedSteps).toHaveLength(7);
    expect(result.preservedSteps[0].thought).toBe('step 0');
    expect(result.preservedSteps[1].thought).toBe('step 1');
    expect(result.preservedSteps[2].thought).toBe('step 5');
    expect(result.preservedSteps[6].thought).toBe('step 9');
  });

  it('returns all steps when count <= KEEP_FIRST + KEEP_LAST', () => {
    const steps = Array.from({ length: 5 }, (_, i) => makeStep({ thought: `step ${i}` }));
    const result = compress(steps, lowThresholdConfig);
    expect(result.preservedSteps).toHaveLength(5);
  });
});

describe('buildMemorySummary', () => {
  it('extracts filesModified from edit_file calls', () => {
    const steps = [
      makeStep({
        action: { tool: 'edit_file', args: { path: 'src/foo.ts', diff: '...' } },
        observation: { success: true, output: 'patched' },
      }),
      makeStep({
        action: { tool: 'read_file', args: { path: 'src/bar.ts' } },
        observation: { success: true, output: 'content' },
      }),
    ];
    const summary = buildMemorySummary(steps);
    expect(summary.filesModified).toContain('src/foo.ts');
    expect(summary.filesModified).not.toContain('src/bar.ts');
  });

  it('extracts shell commands and errors', () => {
    const steps = [
      makeStep({
        action: { tool: 'shell', args: { command: 'npm test' } },
        observation: { success: false, output: '', error: 'test failed' },
      }),
    ];
    const summary = buildMemorySummary(steps);
    expect(summary.keyDecisions.some((d) => d.includes('npm test'))).toBe(true);
    expect(summary.keyDecisions.some((d) => d.includes('test failed'))).toBe(true);
  });
});

describe('formatMemoryForInjection', () => {
  it('produces [Context Compression...] text', () => {
    const memory = {
      goal: 'Fix the bug',
      filesModified: ['a.ts', 'b.ts'],
      keyDecisions: ['chose approach A'],
      currentStep: 'step 5',
    };
    const text = formatMemoryForInjection(memory);
    expect(text).toContain('[Context Compression');
    expect(text).toContain('Fix the bug');
    expect(text).toContain('a.ts, b.ts');
    expect(text).toContain('chose approach A');
    expect(text).toContain('[End Summary]');
  });
});
