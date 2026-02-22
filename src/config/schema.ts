export const DEFAULT_CONFIG = {
  cdpPort: 9222,
  maxIterations: 50,
  maxParseFailures: 3,
  shellTimeout: 120000, // 120 seconds
  fileReadMaxSize: 102400, // 100KB
  stabilityThreshold: 3, // polls with same content = done
  stabilityPollingInterval: 500, // ms between polls
  workingDirectory: process.cwd(),
  sessionDir: '.cdp-agent-sessions',
  verbose: false,
} as const;

export type ConfigDefaults = typeof DEFAULT_CONFIG;
