import { appendFileSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MAX_LOG_BYTES = 5 * 1024 * 1024; // 5 MB — rotate after this

function timestampForFilename(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

export class Logger {
  private readonly logFile: string;
  private readonly errorFile: string;
  private readonly minLevel: LogLevel;
  private readonly startTime: number;

  constructor(sessionDir: string, minLevel: LogLevel = 'debug') {
    mkdirSync(sessionDir, { recursive: true });
    const ts = timestampForFilename();
    const baseName = `cdp-agent-${ts}`;
    this.logFile = join(sessionDir, `${baseName}.log`);
    this.errorFile = join(sessionDir, `${baseName}.error.log`);
    this.minLevel = minLevel;
    this.startTime = Date.now();

    this.rotateIfNeeded(this.logFile);
    this.rotateIfNeeded(this.errorFile);

    this.append(
      this.logFile,
      `\n${'═'.repeat(60)}\n  CDP Agent — ${new Date().toISOString()}\n  PID ${process.pid} | Node ${process.version} | ${process.platform}\n${'═'.repeat(60)}\n`,
    );
  }

  private rotateIfNeeded(filePath: string): void {
    try {
      const stats = statSync(filePath);
      if (stats.size > MAX_LOG_BYTES) {
        const rotated = `${filePath}.old`;
        Bun.write(rotated, Bun.file(filePath));
        Bun.write(filePath, '');
      }
    } catch {
      // file doesn't exist yet
    }
  }

  private append(filePath: string, line: string): void {
    try {
      appendFileSync(filePath, line);
    } catch {
      // filesystem failure — nothing we can do
    }
  }

  private write(level: LogLevel, msg: string, err?: Error): void {
    if (LEVEL_RANK[level] < LEVEL_RANK[this.minLevel]) return;

    const ts = new Date().toISOString();
    const elapsed = `+${((Date.now() - this.startTime) / 1000).toFixed(1)}s`;
    const tag = level.toUpperCase().padEnd(5);
    const line = `[${ts}] [${tag}] [${elapsed}] ${msg}\n`;

    this.append(this.logFile, line);

    if (level === 'error' || level === 'warn') {
      this.append(this.errorFile, line);
      if (err?.stack) {
        const stackLines = err.stack
          .split('\n')
          .slice(1)
          .map((l) => `  ${l.trim()}`)
          .join('\n');
        this.append(this.errorFile, `${stackLines}\n`);
        this.append(this.logFile, `${stackLines}\n`);
      }
    }
  }

  debug(msg: string): void {
    this.write('debug', msg);
  }

  info(msg: string): void {
    this.write('info', msg);
  }

  warn(msg: string, err?: Error): void {
    this.write('warn', msg, err);
  }

  error(msg: string, err?: Error): void {
    this.write('error', msg, err ?? new Error(msg));
  }

  time(label: string): () => void {
    const start = Date.now();
    this.debug(`⏱ ${label} started`);
    return () => {
      this.debug(`⏱ ${label} done (${Date.now() - start}ms)`);
    };
  }

  get path(): string {
    return this.logFile;
  }

  get errorPath(): string {
    return this.errorFile;
  }
}
