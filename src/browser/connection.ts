import type { Browser, Page } from 'playwright-core';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { AgentConfig, BrowserConnection } from '../types/index.js';
import { healthCheck } from './selectors.js';

let stealthInitialized = false;

/**
 * Discover the Chrome DevTools WebSocket endpoint from the CDP port.
 */
export async function discoverEndpoint(port: number): Promise<string> {
  const url = `http://localhost:${port}/json/version`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error(
      `Cannot connect to Chrome on port ${port}. ` + `Make sure Chrome is running with --remote-debugging-port=${port}`,
    );
  }

  if (!res.ok) {
    throw new Error(`Chrome CDP endpoint returned ${res.status} at ${url}`);
  }

  const data = (await res.json()) as { webSocketDebuggerUrl?: string };
  if (!data.webSocketDebuggerUrl) {
    throw new Error(`No webSocketDebuggerUrl in Chrome CDP response from ${url}`);
  }

  return data.webSocketDebuggerUrl;
}

/**
 * Connect to an existing Chrome instance via CDP.
 * Initializes stealth plugin to mask automation fingerprints.
 */
export async function connect(config: AgentConfig): Promise<BrowserConnection> {
  if (!stealthInitialized) {
    chromium.use(StealthPlugin());
    stealthInitialized = true;
  }

  const wsUrl = await discoverEndpoint(config.cdpPort);

  if (config.verbose) {
    console.log(`[browser] Connecting to Chrome at ${wsUrl}`);
  }

  const browser = await chromium.connectOverCDP(wsUrl);

  if (config.verbose) {
    console.log('[browser] CDP connection established');
  }

  const page = await findGeminiPage(browser);

  if (config.verbose) {
    console.log(`[browser] Gemini tab found: ${page.url()}`);
  }

  const connection: BrowserConnection = {
    browser,
    page,
    connected: true,
  };

  browser.on('disconnected', () => {
    connection.connected = false;
    if (config.verbose) {
      console.log('[browser] CDP connection lost');
    }
  });

  return connection;
}

/**
 * Find the Gemini tab in the connected browser.
 * Searches all contexts and pages for gemini.google.com.
 */
export async function findGeminiPage(browser: Browser): Promise<Page> {
  for (const ctx of browser.contexts()) {
    for (const pg of ctx.pages()) {
      if (pg.url().includes('gemini.google.com')) {
        return pg;
      }
    }
  }
  throw new Error('No Gemini tab found. Please open gemini.google.com in Chrome before running cdp-agent.');
}

/**
 * Gracefully disconnect from Chrome without closing the user's browser.
 */
export async function disconnect(connection: BrowserConnection): Promise<void> {
  if (connection.connected) {
    connection.connected = false;
    // Use close() to disconnect CDP session without closing Chrome
    await connection.browser.close();
  }
}

/**
 * Check if the CDP connection is still alive.
 */
export function isConnected(connection: BrowserConnection): boolean {
  return connection.connected;
}

/**
 * Run selector health check and log results.
 */
export async function runHealthCheck(connection: BrowserConnection, verbose = false): Promise<void> {
  const results = await healthCheck(connection.page);
  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);

  if (verbose) {
    console.log(`[browser] Selector health check: ${passed.length}/${results.length} passed`);
    for (const r of passed) {
      console.log(`  ✓ ${r.chain.name}: "${r.workingSelector}"`);
    }
    for (const r of failed) {
      console.log(`  ✗ ${r.chain.name}: no working selector`);
    }
  }

  if (failed.length > 0 && verbose) {
    console.warn(
      `[browser] Warning: ${failed.length} selector chains failed. ` +
        `Gemini DOM may have changed. Update src/browser/selectors.ts if needed.`,
    );
  }
}
