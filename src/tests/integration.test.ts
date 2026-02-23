// src/tests/integration.test.ts
// Integration tests — full ReAct loop pipeline with MockProtocol (no real browser)

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Page } from 'puppeteer-core';
import type { GeminiProtocol } from '../browser/protocol.js';
import { parseResponse } from '../engine/parser.js';
import { ReActLoop } from '../engine/react-loop.js';
import { SessionManager } from '../session/manager.js';
import { createEditFileTool } from '../tools/edit-file.js';
import { createReadFileTool } from '../tools/read-file.js';
import { createSearchDirectoryTool } from '../tools/search-directory.js';
import { createShellTool } from '../tools/shell.js';
import type { AgentConfig, Tool } from '../types/index.js';

// ---------------------------------------------------------------------------
// MockProtocol — same interface as GeminiProtocol, returns canned responses
// ---------------------------------------------------------------------------

class MockProtocol {
  private responses: string[];
  private responseIndex = 0;
  injectedTexts: string[] = [];

  constructor(responses: string[]) {
    this.responses = responses;
  }

  async injectText(_page: unknown, text: string): Promise<void> {
    this.injectedTexts.push(text);
  }

  async submitMessage(_page: unknown): Promise<void> {}

  async extractResponse(_page: unknown): Promise<string> {
    return this.responses[this.responseIndex++] ?? '';
  }

  async waitForCompletion(_page: unknown, _config: unknown): Promise<boolean> {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let tmpDir: string;
const fakePage = null as unknown as Page;

function makeConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    cdpPort: 9222,
    maxIterations: 10,
    maxParseFailures: 3,
    shellTimeout: 5000,
    fileReadMaxSize: 102400,
    stabilityThreshold: 3,
    stabilityPollingInterval: 500,
    workingDirectory: tmpDir,
    sessionDir: join(tmpDir, 'sessions'),
    verbose: false,
    ...overrides,
  };
}

function makeTools(config: AgentConfig): Map<string, Tool> {
  const tools = new Map<string, Tool>();
  const readFile = createReadFileTool(config.workingDirectory, config.fileReadMaxSize);
  const searchDir = createSearchDirectoryTool(config.workingDirectory);
  const editFile = createEditFileTool(config.workingDirectory);
  const shell = createShellTool(config.workingDirectory, config.shellTimeout);
  tools.set(readFile.name, readFile);
  tools.set(searchDir.name, searchDir);
  tools.set(editFile.name, editFile);
  tools.set(shell.name, shell);
  return tools;
}

function buildLoop(mock: MockProtocol, config: AgentConfig, sessionManager: SessionManager): ReActLoop {
  return new ReActLoop(
    fakePage,
    mock as unknown as typeof GeminiProtocol,
    parseResponse,
    sessionManager,
    makeTools(config),
    config,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Integration: ReAct loop with MockProtocol', () => {
  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'cdp-test-'));
    // Seed a package.json so read_file has something to read
    await writeFile(join(tmpDir, 'package.json'), JSON.stringify({ name: 'test-project', version: '1.0.0' }));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // 1 — Full loop: read file then TASK_COMPLETE
  it('full loop — read file task completes successfully', async () => {
    const mock = new MockProtocol([
      '```json\n{"tool":"read_file","args":{"path":"package.json"}}\n```',
      'TASK_COMPLETE: Successfully read the file',
    ]);

    const config = makeConfig();
    const sm = new SessionManager(config.sessionDir);
    const loop = buildLoop(mock, config, sm);

    const result = await loop.run('Read package.json');

    expect(result.success).toBe(true);
    expect(result.steps.length).toBeGreaterThanOrEqual(1);
    expect(result.steps[0].action.tool).toBe('read_file');
    expect(result.steps[0].observation.success).toBe(true);
    expect(result.steps[0].observation.output).toContain('test-project');
  });

  // 2 — maxIterations cap
  it('maxIterations cap terminates the loop', async () => {
    const toolCall = '```json\n{"tool":"read_file","args":{"path":"package.json"}}\n```';
    const mock = new MockProtocol([toolCall, toolCall, toolCall, toolCall, toolCall]);

    const config = makeConfig({ maxIterations: 3 });
    const sm = new SessionManager(config.sessionDir);
    const loop = buildLoop(mock, config, sm);

    const result = await loop.run('Loop forever');

    expect(result.success).toBe(false);
    expect(result.steps.length).toBe(3);
    expect(result.reason).toContain('maxIterations');
  });

  // 3 — Parse failure abort
  it('parse failure abort after consecutive failures', async () => {
    const mock = new MockProtocol([
      'gibberish no tool calls here',
      'more gibberish without any json blocks',
      'still gibberish',
    ]);

    const config = makeConfig({ maxParseFailures: 2 });
    const sm = new SessionManager(config.sessionDir);
    const loop = buildLoop(mock, config, sm);

    const result = await loop.run('Do something');

    expect(result.success).toBe(false);
    expect(result.reason).toContain('parse');
  });

  // 4 — TASK_FAILED signal
  it('TASK_FAILED signal is handled correctly', async () => {
    const mock = new MockProtocol(['TASK_FAILED: Cannot complete this task']);

    const config = makeConfig();
    const sm = new SessionManager(config.sessionDir);
    const loop = buildLoop(mock, config, sm);

    const result = await loop.run('Impossible task');

    expect(result.success).toBe(false);
    expect(result.reason).toContain('Cannot complete');
  });

  // 5 — Session persistence
  it('session persistence — file exists and loads correctly', async () => {
    const mock = new MockProtocol([
      '```json\n{"tool":"read_file","args":{"path":"package.json"}}\n```',
      'TASK_COMPLETE: Done',
    ]);

    const config = makeConfig();
    const sm = new SessionManager(config.sessionDir);
    const loop = buildLoop(mock, config, sm);

    const prompt = 'Read package.json for persistence test';
    const result = await loop.run(prompt);

    expect(result.success).toBe(true);

    // Load the session back from disk
    const loaded = await sm.load(result.sessionId);
    expect(loaded).not.toBeNull();
    expect(loaded?.id).toBe(result.sessionId);
    expect(loaded?.prompt).toBe(prompt);
    expect(loaded?.steps.length).toBeGreaterThanOrEqual(1);
  });

  // 6 — Unknown tool returns error observation (bonus coverage)
  it('unknown tool call returns error and loop continues', async () => {
    const mock = new MockProtocol(['```json\n{"tool":"nonexistent_tool","args":{}}\n```', 'TASK_COMPLETE: Gave up']);

    const config = makeConfig();
    const sm = new SessionManager(config.sessionDir);
    const loop = buildLoop(mock, config, sm);

    const result = await loop.run('Try unknown tool');

    expect(result.success).toBe(true);
    expect(result.steps.length).toBe(1);
    expect(result.steps[0].observation.success).toBe(false);
    expect(result.steps[0].observation.error).toContain('Unknown tool');
  });
});

// ---------------------------------------------------------------------------
// E2E (skipped — requires real Chrome + Gemini)
// ---------------------------------------------------------------------------

describe.skip('E2E with real Gemini', () => {
  it('connects and runs', async () => {
    // This test requires a real Chrome browser with Gemini open.
    // Launch Chrome: google-chrome --remote-debugging-port=9222
    // Open gemini.google.com, then run:
    //   bun test --grep "E2E with real Gemini"
  });
});
