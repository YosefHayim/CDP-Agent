import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverEndpoint } from './connection.js';

const CHROME_PATHS: Record<string, string> = {
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  linux: 'google-chrome',
  win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
};

/**
 * Get the Chrome executable path for the current platform.
 */
export function getChromePath(): string {
  const path = CHROME_PATHS[process.platform];
  if (!path) {
    throw new Error(`Unsupported platform: ${process.platform}. Use --launch-chrome only on macOS, Linux, or Windows.`);
  }
  return path;
}

/**
 * Wait for Chrome CDP endpoint to be available.
 */
async function waitForPort(port: number, timeoutMs: number): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      return await discoverEndpoint(port);
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error(`Chrome did not become ready on port ${port} within ${timeoutMs}ms`);
}

/**
 * Launch Chrome with remote debugging and wait for CDP to be ready.
 * Uses a temporary user-data-dir so it does not conflict with the user's main Chrome.
 */
export async function launchChrome(port: number, verbose = false): Promise<void> {
  const chromePath = getChromePath();
  const userDataDir = mkdtempSync(join(tmpdir(), 'cdp-agent-chrome-'));

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-default-apps',
    'https://gemini.google.com',
  ];

  if (verbose) {
    console.log(`[browser] Launching Chrome: ${chromePath} ${args.join(' ')}`);
  }

  const proc = spawn(chromePath, args, {
    detached: true,
    stdio: 'ignore',
  });
  proc.unref();

  await waitForPort(port, 15_000);
}
