import { describe, expect, it } from 'bun:test';
import { ALL_CHAINS, applyConfigOverrides, GEMINI_INPUT } from '../browser/selectors.js';

describe('selector registry', () => {
  it('ALL_CHAINS contains all 6 selector chains', () => {
    expect(ALL_CHAINS).toHaveLength(6);
    const names = ALL_CHAINS.map((c) => c.name);
    expect(names).toContain('GEMINI_INPUT');
    expect(names).toContain('GEMINI_SEND_BUTTON');
    expect(names).toContain('GEMINI_RESPONSE');
    expect(names).toContain('GEMINI_THINKING');
    expect(names).toContain('GEMINI_STOP_BUTTON');
    expect(names).toContain('GEMINI_LOADING');
  });

  it('each chain has name, selectors array, and description', () => {
    for (const chain of ALL_CHAINS) {
      expect(typeof chain.name).toBe('string');
      expect(Array.isArray(chain.selectors)).toBe(true);
      expect(chain.selectors.length).toBeGreaterThan(0);
      expect(typeof chain.description).toBe('string');
    }
  });

  it('applyConfigOverrides replaces selectors', () => {
    const original = [...GEMINI_INPUT.selectors];
    applyConfigOverrides({ GEMINI_INPUT: ['#custom-input', '.fallback'] });
    expect(GEMINI_INPUT.selectors).toEqual(['#custom-input', '.fallback']);
    applyConfigOverrides({ GEMINI_INPUT: original });
  });
});
