import type { Browser, Page } from 'puppeteer-core';
import puppeteer from 'puppeteer-core';
import type { AgentConfig, BrowserConnection } from '../types/index.js';
import { healthCheck } from './selectors.js';

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
 * Uses puppeteer-core — Playwright's WebSocket transport is incompatible with Bun.
 */
export async function connect(config: AgentConfig, autoCreateGeminiTab = false): Promise<BrowserConnection> {
  const log = config.verbose ? (msg: string) => console.log(`[browser] ${msg}`) : () => {};

  const wsUrl = await discoverEndpoint(config.cdpPort);
  log(`WebSocket URL: ${wsUrl}`);

  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl, protocolTimeout: 15_000 });
  const allPages = await browser.pages();
  log(`CDP connected — ${allPages.length} page(s)`);
  for (const pg of allPages) {
    log(`  page: ${pg.url()}`);
  }

  const page = await findGeminiPage(browser, autoCreateGeminiTab);
  log(`Gemini tab ready: ${page.url()}`);

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
 * Searches all pages for gemini.google.com.
 * When autoCreate is true, opens a new Gemini tab if none exists.
 */
export async function findGeminiPage(browser: Browser, autoCreate = false): Promise<Page> {
  const allPages = await browser.pages();

  for (const pg of allPages) {
    if (pg.url().includes('gemini.google.com')) {
      return pg;
    }
  }

  if (autoCreate) {
    const page = await browser.newPage();
    await page.goto('https://gemini.google.com', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    return page;
  }

  throw new Error('No Gemini tab found. Please open gemini.google.com in Chrome before running cdp-agent.');
}

/**
 * Gracefully disconnect from Chrome without closing the user's browser.
 */
export async function disconnect(connection: BrowserConnection): Promise<void> {
  if (connection.connected) {
    connection.connected = false;
    connection.browser.disconnect();
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
