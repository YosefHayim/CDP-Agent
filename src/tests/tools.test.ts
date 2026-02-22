import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEditFileTool } from '../tools/edit-file.js';
import { createReadFileTool } from '../tools/read-file.js';
import { createSearchDirectoryTool } from '../tools/search-directory.js';
import { createShellTool } from '../tools/shell.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'cdp-tools-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('read_file', () => {
  it('returns content with line numbers for existing file', async () => {
    await writeFile(join(tempDir, 'test.txt'), 'line1\nline2\nline3');
    const tool = createReadFileTool(tempDir);
    const result = await tool.execute({ path: 'test.txt' });
    expect(result.success).toBe(true);
    expect(result.output).toContain('1: line1');
    expect(result.output).toContain('2: line2');
    expect(result.output).toContain('3: line3');
  });

  it('returns success:false for missing file', async () => {
    const tool = createReadFileTool(tempDir);
    const result = await tool.execute({ path: 'nonexistent.txt' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('rejects path traversal', async () => {
    const tool = createReadFileTool(tempDir);
    const result = await tool.execute({ path: '../../../etc/passwd' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('outside');
  });
});

describe('search_directory', () => {
  it('finds .ts files', async () => {
    await writeFile(join(tempDir, 'a.ts'), '');
    await writeFile(join(tempDir, 'b.ts'), '');
    await writeFile(join(tempDir, 'c.js'), '');
    const tool = createSearchDirectoryTool(tempDir);
    const result = await tool.execute({ pattern: '**/*.ts' });
    expect(result.success).toBe(true);
    expect(result.output).toContain('a.ts');
    expect(result.output).toContain('b.ts');
    expect(result.output).not.toContain('c.js');
  });

  it('excludes node_modules', async () => {
    await mkdir(join(tempDir, 'node_modules'), { recursive: true });
    await writeFile(join(tempDir, 'node_modules', 'dep.ts'), '');
    await writeFile(join(tempDir, 'src.ts'), '');
    const tool = createSearchDirectoryTool(tempDir);
    const result = await tool.execute({ pattern: '**/*.ts' });
    expect(result.success).toBe(true);
    expect(result.output).toContain('src.ts');
    expect(result.output).not.toContain('dep.ts');
  });
});

describe('edit_file', () => {
  it('applies valid unified diff', async () => {
    await writeFile(join(tempDir, 'test.txt'), 'line1\nline2\nline3\n');
    const diff = [
      '--- a/test.txt',
      '+++ b/test.txt',
      '@@ -1,3 +1,3 @@',
      ' line1',
      '-line2',
      '+line2modified',
      ' line3',
    ].join('\n');
    const tool = createEditFileTool(tempDir);
    const result = await tool.execute({ path: 'test.txt', diff });
    expect(result.success).toBe(true);
    expect(result.output).toContain('patched');

    const content = await Bun.file(join(tempDir, 'test.txt')).text();
    expect(content).toContain('line2modified');
  });

  it('returns success:false for invalid diff', async () => {
    await writeFile(join(tempDir, 'test.txt'), 'original content\n');
    const badDiff = [
      '--- a/test.txt',
      '+++ b/test.txt',
      '@@ -1,3 +1,3 @@',
      ' this does not match',
      '-something else',
      '+replacement',
      ' more non-matching',
    ].join('\n');
    const tool = createEditFileTool(tempDir);
    const result = await tool.execute({ path: 'test.txt', diff: badDiff });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to apply diff');
  });
});

describe('shell', () => {
  it('executes echo command and captures stdout', async () => {
    const tool = createShellTool(tempDir);
    const result = await tool.execute({ command: 'echo hello world' });
    expect(result.success).toBe(true);
    expect(result.output).toContain('hello world');
    expect(result.output).toContain('EXIT CODE: 0');
  });

  it('enforces timeout', async () => {
    const tool = createShellTool(tempDir, 100);
    const result = await tool.execute({ command: 'sleep 10' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('TIMED OUT');
  }, 15000);

  it('captures non-zero exit code', async () => {
    const tool = createShellTool(tempDir);
    const result = await tool.execute({ command: 'exit 42' });
    expect(result.success).toBe(false);
    expect(result.output).toContain('EXIT CODE: 42');
    expect(result.error).toContain('42');
  });
});
