// src/browser/protocol.ts
// Gemini page interaction — injection, submission, extraction, completion detection

import type { Page } from 'puppeteer-core';
import type { AgentConfig } from '../types/index.js';
import {
  extractResponseText,
  findElement,
  GEMINI_INPUT,
  GEMINI_SEND_BUTTON,
  GEMINI_STOP_BUTTON,
  waitForElement,
} from './selectors.js';

/**
 * Inject text into Quill editor via clipboard/execCommand.
 * NEVER use page.type() or page.fill() — Quill breaks with those.
 */
export async function injectText(page: Page, text: string): Promise<void> {
  const editor = await waitForElement(page, GEMINI_INPUT);
  await editor.click();

  let injected = false;

  // Strategy 1: Clipboard paste
  try {
    await page.evaluate(async (t: string) => {
      await navigator.clipboard.writeText(t);
    }, text);
    await new Promise((r) => setTimeout(r, 100));
    // macOS Chrome uses Cmd+V, Linux/Windows use Ctrl+V
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.down(modifier);
    await page.keyboard.press('v');
    await page.keyboard.up(modifier);
    await new Promise((r) => setTimeout(r, 200));

    const content = await page.evaluate((selectors: string[]) => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) return el.textContent.trim();
      }
      return '';
    }, GEMINI_INPUT.selectors);

    if (content.length > 0) {
      injected = true;
    }
  } catch {
    // Clipboard API may fail — fall through to execCommand
  }

  // Strategy 2: execCommand fallback
  if (!injected) {
    await editor.click();
    await page.evaluate(
      ({ t, selectors }: { t: string; selectors: string[] }) => {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            (el as HTMLElement).focus();
            document.execCommand('insertText', false, t);
            return;
          }
        }
      },
      { t: text, selectors: GEMINI_INPUT.selectors },
    );
    await new Promise((r) => setTimeout(r, 200));
  }

  // Final verification
  const finalContent = await page.evaluate((selectors: string[]) => {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) return el.textContent.trim();
    }
    return '';
  }, GEMINI_INPUT.selectors);

  if (finalContent.length === 0) {
    console.warn('[protocol] Text injection may have failed — editor appears empty');
  }
}

/**
 * Click the send button using selector fallback chain.
 * Waits for button to be enabled before clicking.
 */
export async function submitMessage(page: Page): Promise<void> {
  const button = await waitForElement(page, GEMINI_SEND_BUTTON);

  // Wait for button to be enabled (up to 10s)
  const enableDeadline = Date.now() + 10000;
  while (Date.now() < enableDeadline) {
    const isDisabled = await button.evaluate((el) => {
      const btn = el as HTMLButtonElement;
      return btn.disabled || btn.getAttribute('aria-disabled') === 'true';
    });
    if (!isDisabled) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  await button.click();
  await new Promise((r) => setTimeout(r, 500));
}

/**
 * Extract the last model response, excluding thinking panels.
 * Delegates to extractResponseText (queryOutsideThoughts pattern).
 * Returns empty string gracefully if no response found.
 */
export async function extractResponse(page: Page): Promise<string> {
  try {
    return await extractResponseText(page);
  } catch {
    return '';
  }
}

/**
 * Dual-signal wait for response completion:
 * 1. Content stability — unchanged for stabilityThreshold consecutive polls
 * 2. Stop button disappearance — streaming finished
 * Either signal triggers completion.
 *
 * @returns true if completed, false if timed out
 */
export async function waitForCompletion(
  page: Page,
  config: Pick<AgentConfig, 'stabilityThreshold' | 'stabilityPollingInterval' | 'shellTimeout'>,
): Promise<boolean> {
  const timeout = config.shellTimeout;
  const pollingInterval = config.stabilityPollingInterval;
  const threshold = config.stabilityThreshold;
  const deadline = Date.now() + timeout;

  let lastContent = '';
  let stableCount = 0;

  while (Date.now() < deadline) {
    const currentContent = await extractResponse(page);

    // Signal 1: Content stability
    if (currentContent.length > 0 && currentContent === lastContent) {
      stableCount++;
    } else {
      stableCount = 0;
    }
    lastContent = currentContent;

    if (stableCount >= threshold) {
      return true;
    }

    // Signal 2: Stop button gone + have content
    const stopButton = await findElement(page, GEMINI_STOP_BUTTON);
    if (!stopButton && currentContent.length > 0) {
      return true;
    }

    await new Promise((r) => setTimeout(r, pollingInterval));
  }

  return false;
}

/** Bundled protocol object for convenience */
export const GeminiProtocol = {
  injectText,
  submitMessage,
  extractResponse,
  waitForCompletion,
};
