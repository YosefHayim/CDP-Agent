// NEVER use single selectors — always use SelectorChain

import type { ElementHandle, Page } from 'playwright-core';
import type { SelectorChain, SelectorHealthResult } from '../types/index.js';

export const GEMINI_INPUT: SelectorChain = {
  name: 'GEMINI_INPUT',
  description: 'Quill editor input field',
  selectors: [
    '.ql-editor[contenteditable="true"]',
    'div.textarea[role="textbox"]',
    'rich-textarea [contenteditable]',
    '[contenteditable="true"]',
    'textarea',
  ],
};

export const GEMINI_SEND_BUTTON: SelectorChain = {
  name: 'GEMINI_SEND_BUTTON',
  description: 'Send message button',
  selectors: [
    'button[aria-label*="Send"]',
    'button[aria-label*="send"]',
    'button.send-button',
    'button[data-test-id="send-button"]',
    'button[jsname="Qx7uuf"]',
  ],
};

export const GEMINI_RESPONSE: SelectorChain = {
  name: 'GEMINI_RESPONSE',
  description: 'Model response content (excludes thinking)',
  selectors: [
    'message-content.model-response-text',
    'div.markdown[id^="model-response"]',
    'message-content:not(model-thoughts message-content)',
    'message-content',
  ],
};

export const GEMINI_THINKING: SelectorChain = {
  name: 'GEMINI_THINKING',
  description: 'Thinking/reasoning content to exclude from responses',
  selectors: ['model-thoughts', '.thoughts-container', '.thoughts-content', '[data-thinking="true"]'],
};

export const GEMINI_STOP_BUTTON: SelectorChain = {
  name: 'GEMINI_STOP_BUTTON',
  description: 'Stop generating button (present while streaming)',
  selectors: [
    'button[aria-label="Stop generating"]',
    'button[aria-label="Stop response"]',
    'button[aria-label*="Stop"]',
    'button.stop-button',
    '.stop-icon',
  ],
};

export const GEMINI_LOADING: SelectorChain = {
  name: 'GEMINI_LOADING',
  description: 'Loading/thinking indicator',
  selectors: ['.thinking-indicator', '.loading-indicator', '.blue-circle', '[aria-label="Loading"]'],
};

export const ALL_CHAINS: SelectorChain[] = [
  GEMINI_INPUT,
  GEMINI_SEND_BUTTON,
  GEMINI_RESPONSE,
  GEMINI_THINKING,
  GEMINI_STOP_BUTTON,
  GEMINI_LOADING,
];

/**
 * Try each selector in the chain, return first matching element or null.
 * Logs which selector matched for debugging.
 */
export async function findElement(page: Page, chain: SelectorChain, verbose = false): Promise<ElementHandle | null> {
  for (const selector of chain.selectors) {
    try {
      const el = await page.$(selector);
      if (el) {
        if (verbose) {
          console.log(`[selectors] ${chain.name}: matched "${selector}"`);
        }
        return el;
      }
    } catch {
      // Selector syntax error — skip
    }
  }
  if (verbose) {
    console.log(`[selectors] ${chain.name}: no match found`);
  }
  return null;
}

/**
 * Wait for any selector in the chain to match, with timeout.
 * Throws descriptive error if all selectors fail within timeout.
 */
export async function waitForElement(
  page: Page,
  chain: SelectorChain,
  timeout = 30000,
  verbose = false,
): Promise<ElementHandle> {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const el = await findElement(page, chain, verbose);
    if (el) return el;
    await new Promise((r) => setTimeout(r, 200));
  }

  throw new Error(
    `[selectors] Timeout waiting for ${chain.name} after ${timeout}ms. ` +
      `Tried selectors: ${chain.selectors.join(', ')}`,
  );
}

/**
 * Test all critical selector chains on the page.
 * Returns health results for each chain.
 */
export async function healthCheck(page: Page): Promise<SelectorHealthResult[]> {
  const results: SelectorHealthResult[] = [];

  for (const chain of ALL_CHAINS) {
    let workingSelector: string | null = null;

    for (const selector of chain.selectors) {
      try {
        const el = await page.$(selector);
        if (el) {
          workingSelector = selector;
          break;
        }
      } catch {
        // Skip invalid selectors
      }
    }

    results.push({
      chain,
      workingSelector,
      passed: workingSelector !== null,
    });
  }

  return results;
}

/**
 * Override selector chains from config.
 * Config format: { "GEMINI_INPUT": ["selector1", "selector2"] }
 */
export function applyConfigOverrides(overrides: Record<string, string[]>): void {
  const chainMap: Record<string, SelectorChain> = {
    GEMINI_INPUT,
    GEMINI_SEND_BUTTON,
    GEMINI_RESPONSE,
    GEMINI_THINKING,
    GEMINI_STOP_BUTTON,
    GEMINI_LOADING,
  };

  for (const [name, selectors] of Object.entries(overrides)) {
    if (chainMap[name]) {
      chainMap[name].selectors = selectors;
    }
  }
}

/**
 * Extract response text from page, excluding thinking content.
 * This is the queryOutsideThoughts pattern.
 */
export async function extractResponseText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const allMessages = Array.from(document.querySelectorAll('message-content'));
    const filtered = allMessages.filter(
      (el) => !el.closest('model-thoughts') && !el.closest('.thoughts-container') && !el.closest('.thoughts-content'),
    );
    return filtered[filtered.length - 1]?.textContent?.trim() ?? '';
  });
}
