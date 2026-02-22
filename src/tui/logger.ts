import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export class Logger {
  private readonly logPath: string;
  private readonly minLevel: LogLevel;

  constructor(sessionDir: string, minLevel: LogLevel = 'debug') {
    mkdirSync(sessionDir, { recursive: true });
    this.logPath = join(sessionDir, 'cdp-agent.log');
    this.minLevel = minLevel;

    writeFileSync(this.logPath, `\n--- CDP Agent TUI started ${new Date().toISOString()} ---\n`, { flag: 'a' });
  }

  private write(level: LogLevel, msg: string): void {
    if (LEVEL_RANK[level] < LEVEL_RANK[this.minLevel]) return;
    const ts = new Date().toISOString();
    const tag = level.toUpperCase().padEnd(5);
    try {
      appendFileSync(this.logPath, `[${ts}] [${tag}] ${msg}\n`);
    } catch {
      // filesystem failure — nothing we can do
    }
  }

  debug(msg: string): void {
    this.write('debug', msg);
  }
  info(msg: string): void {
    this.write('info', msg);
  }
  warn(msg: string): void {
    this.write('warn', msg);
  }
  error(msg: string): void {
    this.write('error', msg);
  }

  get path(): string {
    return this.logPath;
  }
}
