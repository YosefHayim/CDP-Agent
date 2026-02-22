import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../config/loader.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'cdp-config-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('loadConfig', () => {
  it('returns default values when no config file exists', () => {
    const config = loadConfig({ config: join(tempDir, 'nonexistent.json') });
    expect(config.cdpPort).toBe(9222);
    expect(config.maxIterations).toBe(50);
    expect(config.verbose).toBe(false);
    expect(config.shellTimeout).toBe(120000);
  });

  it('loads values from config file', async () => {
    const configPath = join(tempDir, 'config.json');
    await writeFile(configPath, JSON.stringify({ cdpPort: 1234, verbose: true }));
    const config = loadConfig({ config: configPath });
    expect(config.cdpPort).toBe(1234);
    expect(config.verbose).toBe(true);
  });

  it('CLI args override config file values', async () => {
    const configPath = join(tempDir, 'config.json');
    await writeFile(configPath, JSON.stringify({ cdpPort: 1234, maxIterations: 100 }));
    const config = loadConfig({ config: configPath, port: 5678, maxIterations: 25 });
    expect(config.cdpPort).toBe(5678);
    expect(config.maxIterations).toBe(25);
  });

  it('handles invalid JSON config gracefully', async () => {
    const configPath = join(tempDir, 'bad.json');
    await writeFile(configPath, '{ this is not valid json!!!');
    const config = loadConfig({ config: configPath });
    expect(config.cdpPort).toBe(9222);
    expect(config.maxIterations).toBe(50);
  });
});
