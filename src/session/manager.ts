import { mkdir, readdir, readFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import type { SessionInfo, SessionState } from '../types/index.js';

export class SessionManager {
  constructor(private readonly sessionDir: string) {}

  /**
   * Atomic save: write to .tmp → rename to .json
   * POSIX rename is atomic on same filesystem.
   */
  async save(state: SessionState): Promise<void> {
    await mkdir(this.sessionDir, { recursive: true });

    const tmpPath = join(this.sessionDir, `${state.id}.tmp`);
    const finalPath = join(this.sessionDir, `${state.id}.json`);

    await Bun.write(tmpPath, JSON.stringify(state, null, 2));
    await rename(tmpPath, finalPath);
  }

  /**
   * Returns null (never throws) on missing or corrupt files.
   * Corrupt files are renamed to .corrupt for forensics.
   */
  async load(id: string): Promise<SessionState | null> {
    const filePath = join(this.sessionDir, `${id}.json`);

    let raw: string;
    try {
      raw = await readFile(filePath, 'utf-8');
    } catch {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const corruptPath = `${filePath}.corrupt`;
      await rename(filePath, corruptPath).catch(() => {});
      return null;
    }

    if (!isValidSession(parsed)) {
      return null;
    }

    return parsed;
  }

  async list(): Promise<SessionInfo[]> {
    let entries: string[];
    try {
      entries = await readdir(this.sessionDir);
    } catch {
      return [];
    }

    const jsonFiles = entries.filter((f) => f.endsWith('.json'));
    const sessions: SessionInfo[] = [];

    for (const file of jsonFiles) {
      const id = file.replace(/\.json$/, '');
      const state = await this.load(id);
      if (state) {
        sessions.push({
          id: state.id,
          prompt: state.prompt,
          createdAt: state.createdAt,
          lastStepAt: state.lastStepAt,
          stepCount: state.steps.length,
        });
      }
    }

    sessions.sort((a, b) => (a.lastStepAt > b.lastStepAt ? -1 : 1));

    return sessions;
  }
}

function isValidSession(value: unknown): value is SessionState {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.id === 'string' && Array.isArray(obj.steps) && typeof obj.createdAt === 'string';
}
