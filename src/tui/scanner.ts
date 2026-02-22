// src/tui/scanner.ts
// Auto-detect Chrome instances with CDP remote debugging enabled

export interface ChromeTab {
  id: string;
  title: string;
  url: string;
  type: string;
  webSocketDebuggerUrl?: string;
}

export interface ChromeInstance {
  port: number;
  webSocketDebuggerUrl: string;
  browser: string;
  tabs: ChromeTab[];
  hasGemini: boolean;
}

/**
 * Scan a range of ports for Chrome instances with CDP enabled.
 * Fires onFound callback as each instance is discovered (parallel scan).
 */
export async function scanCdpPorts(
  portRange = { start: 9222, end: 9232 },
  onFound?: (instance: ChromeInstance) => void,
): Promise<ChromeInstance[]> {
  const instances: ChromeInstance[] = [];

  const promises: Promise<void>[] = [];
  for (let port = portRange.start; port <= portRange.end; port++) {
    promises.push(
      probePort(port).then((instance) => {
        if (instance) {
          instances.push(instance);
          onFound?.(instance);
        }
      }),
    );
  }

  await Promise.all(promises);
  return instances;
}

async function probePort(port: number): Promise<ChromeInstance | null> {
  try {
    const versionRes = await fetch(`http://localhost:${port}/json/version`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!versionRes.ok) return null;

    const version = (await versionRes.json()) as {
      webSocketDebuggerUrl?: string;
      Browser?: string;
    };
    if (!version.webSocketDebuggerUrl) return null;

    const tabsRes = await fetch(`http://localhost:${port}/json/list`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!tabsRes.ok) return null;

    const tabs = (await tabsRes.json()) as ChromeTab[];

    return {
      port,
      webSocketDebuggerUrl: version.webSocketDebuggerUrl,
      browser: version.Browser ?? 'Chrome',
      tabs,
      hasGemini: tabs.some((t) => t.url.includes('gemini.google.com')),
    };
  } catch {
    return null;
  }
}
