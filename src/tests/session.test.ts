import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionManager } from '../session/manager.js';
import type { SessionState } from '../types/index.js';

let tempDir: string;
let manager: SessionManager;

function makeSession(overrides: Partial<SessionState> = {}): SessionState {
  return {
    id: overrides.id ?? 'test-session',
    prompt: overrides.prompt ?? 'do stuff',
    steps: overrides.steps ?? [],
    config: overrides.config ?? {},
    createdAt: overrides.createdAt ?? '2025-01-01T00:00:00Z',
    lastStepAt: overrides.lastStepAt ?? '2025-01-01T00:01:00Z',
  };
}

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'cdp-session-'));
  manager = new SessionManager(join(tempDir, 'sessions'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('SessionManager', () => {
  it('save + load round-trip', async () => {
    const session = makeSession({ id: 'roundtrip' });
    await manager.save(session);
    const loaded = await manager.load('roundtrip');
    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe('roundtrip');
    expect(loaded?.prompt).toBe('do stuff');
    expect(loaded?.steps).toEqual([]);
  });

  it('load returns null for missing file', async () => {
    const result = await manager.load('nonexistent');
    expect(result).toBeNull();
  });

  it('load returns null and renames corrupt file', async () => {
    const sessionDir = join(tempDir, 'sessions');
    await mkdir(sessionDir, { recursive: true });
    await writeFile(join(sessionDir, 'corrupt.json'), '{ not valid json!!!');

    const loaded = await manager.load('corrupt');
    expect(loaded).toBeNull();
    expect(existsSync(join(sessionDir, 'corrupt.json.corrupt'))).toBe(true);
  });

  it('list returns sessions sorted by lastStepAt descending', async () => {
    await manager.save(makeSession({ id: 'old', lastStepAt: '2025-01-01T00:00:00Z' }));
    await manager.save(makeSession({ id: 'new', lastStepAt: '2025-06-01T00:00:00Z' }));
    await manager.save(makeSession({ id: 'mid', lastStepAt: '2025-03-01T00:00:00Z' }));

    const list = await manager.list();
    expect(list).toHaveLength(3);
    expect(list[0].id).toBe('new');
    expect(list[1].id).toBe('mid');
    expect(list[2].id).toBe('old');
  });

  it('session dir is auto-created on first save', async () => {
    const deepDir = join(tempDir, 'deep', 'nested', 'sessions');
    const mgr = new SessionManager(deepDir);
    await mgr.save(makeSession({ id: 'auto' }));
    expect(existsSync(join(deepDir, 'auto.json'))).toBe(true);
  });
});
