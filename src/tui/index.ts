import { BrowserBridge } from '../browser/index.js';
import { launchChrome } from '../browser/launch.js';
import { GeminiProtocol } from '../browser/protocol.js';
import { loadConfig } from '../config/loader.js';
import { parseResponse } from '../engine/parser.js';
import { ReActLoop } from '../engine/react-loop.js';
import { SessionManager } from '../session/manager.js';
import { createEditFileTool } from '../tools/edit-file.js';
import { createReadFileTool } from '../tools/read-file.js';
import { createSearchDirectoryTool } from '../tools/search-directory.js';
import { createShellTool } from '../tools/shell.js';
import type { Tool } from '../types/index.js';
import { Dashboard } from './dashboard.js';
import { Logger } from './logger.js';
import { scanCdpPorts } from './scanner.js';

const DEFAULT_CDP_PORT = 9222;
const GEMINI_LOAD_DELAY = 4000;

export async function launchTui(): Promise<void> {
  const config = loadConfig();
  const sessionManager = new SessionManager(config.sessionDir);
  const logger = new Logger(config.sessionDir);

  logger.info('TUI starting');

  let bridge: BrowserBridge | null = null;
  let isRunning = false;

  const dashboard = new Dashboard(
    {
      onPromptSubmit: (prompt) => {
        if (isRunning || !bridge) return;
        runAgent(prompt).catch((err: unknown) => {
          logger.error(`Agent crash: ${(err as Error).message}`);
          dashboard.log(`{red-fg}Fatal: ${(err as Error).message}{/red-fg}`);
          isRunning = false;
          dashboard.setInputEnabled(true);
        });
      },

      onSessionSelect: (sessionId) => {
        if (sessionId) {
          logger.info(`Session selected: ${sessionId}`);
          dashboard.log(`{#6a6a8e-fg}Session selected: ${sessionId}{/#6a6a8e-fg}`);
        }
      },

      onQuit: async () => {
        logger.info('Shutting down');
        if (bridge) {
          try {
            await bridge.disconnect();
          } catch {
            /* shutdown cleanup */
          }
        }
        dashboard.destroy();
        process.exit(0);
      },
    },
    logger,
  );

  // ── Phase 1: Find or launch Chrome ──────────────────────────────────

  dashboard.setStatus('Scanning…');
  dashboard.log('{#6a6a8e-fg}Scanning for Chrome CDP…{/#6a6a8e-fg}');

  let instances = await scanCdpPorts(undefined, (instance) => {
    const geminiTag = instance.hasGemini ? ' {green-fg}★ Gemini{/green-fg}' : '';
    logger.info(`Found Chrome on port ${instance.port} (${instance.tabs.length} tabs)`);
    dashboard.log(
      `  {#7fdbca-fg}●{/#7fdbca-fg} Port ${instance.port} — ${instance.browser} (${instance.tabs.length} tabs)${geminiTag}`,
    );
  });

  if (instances.length === 0) {
    dashboard.log('');
    dashboard.log('{yellow-fg}No Chrome with CDP found — launching Chrome…{/yellow-fg}');
    logger.info('No Chrome found, launching');
    dashboard.setStatus('Launching Chrome…');

    try {
      await launchChrome(DEFAULT_CDP_PORT, config.verbose);
      logger.info(`Chrome launched on port ${DEFAULT_CDP_PORT}`);
      dashboard.log('{green-fg}✓ Chrome launched{/green-fg}');

      await new Promise((r) => setTimeout(r, GEMINI_LOAD_DELAY));
      instances = await scanCdpPorts();
    } catch (err) {
      logger.error(`Chrome launch failed: ${(err as Error).message}`);
      dashboard.setStatus('{red-fg}✗ Chrome launch failed{/red-fg}');
      dashboard.log(`{red-fg}${(err as Error).message}{/red-fg}`);
      dashboard.log('');
      dashboard.log('Install Chrome or launch manually:');
      dashboard.log('  chrome --remote-debugging-port=9222 https://gemini.google.com');
      return;
    }
  }

  // ── Phase 2: Ensure Gemini tab exists ───────────────────────────────

  let target = instances.find((i) => i.hasGemini);

  if (!target && instances.length > 0) {
    const chrome = instances[0];
    dashboard.log('{yellow-fg}No Gemini tab — opening one…{/yellow-fg}');
    logger.info(`Opening Gemini tab on port ${chrome.port}`);

    try {
      await openGeminiTab(chrome.port);
      await new Promise((r) => setTimeout(r, GEMINI_LOAD_DELAY));
      const refreshed = await scanCdpPorts();
      target = refreshed.find((i) => i.hasGemini);
    } catch (err) {
      logger.error(`Failed to open Gemini tab: ${(err as Error).message}`);
    }
  }

  if (!target) {
    dashboard.setStatus('{red-fg}✗ No Gemini tab{/red-fg}');
    dashboard.log('{red-fg}Could not find or open a Gemini tab.{/red-fg}');
    dashboard.log('Open {bold}gemini.google.com{/bold} in Chrome and restart.');
    return;
  }

  // ── Phase 3: Connect ────────────────────────────────────────────────

  config.cdpPort = target.port;
  dashboard.setStatus(`Connecting to Chrome:${target.port}…`);
  logger.info(`Connecting to Chrome on port ${target.port}`);

  try {
    bridge = new BrowserBridge(config);
    await bridge.connect();
    dashboard.setStatus(`{green-fg}●{/green-fg} Chrome:${target.port} — Gemini ✓`);
    dashboard.log('');
    dashboard.log('{green-fg}✓ Connected to Chrome · Gemini tab found{/green-fg}');
    logger.info('Connected');
  } catch (err) {
    logger.error(`Connection failed: ${(err as Error).message}`);
    dashboard.setStatus('{red-fg}✗ Connection failed{/red-fg}');
    dashboard.log(`{red-fg}Error: ${(err as Error).message}{/red-fg}`);
    return;
  }

  // ── Phase 4: Load sessions & ready ──────────────────────────────────

  const sessions = await sessionManager.list();
  dashboard.setSessions(sessions);

  if (sessions.length > 0) {
    dashboard.log(`{#6a6a8e-fg}${sessions.length} previous session(s) loaded{/#6a6a8e-fg}`);
  }

  dashboard.log('');
  dashboard.log(`Ready — type a prompt below to begin.  {#6a6a8e-fg}Log: ${logger.path}{/#6a6a8e-fg}`);
  dashboard.focusPrompt();

  // ── Agent runner ────────────────────────────────────────────────────

  async function runAgent(prompt: string): Promise<void> {
    if (!bridge || isRunning) return;
    isRunning = true;
    dashboard.setInputEnabled(false);

    const sessionId = Date.now().toString(36);
    logger.info(`Session ${sessionId} started: ${prompt}`);

    dashboard.log('');
    dashboard.log(`{bold}━━━ Session: ${sessionId} ━━━{/bold}`);
    dashboard.log(`{#6a6a8e-fg}Prompt:{/#6a6a8e-fg} ${prompt}`);
    dashboard.log('');

    let stepCount = 0;
    const connection = bridge.getConnection();

    function wrapTool(tool: Tool): Tool {
      return {
        name: tool.name,
        description: tool.description,
        async execute(args: Record<string, unknown>) {
          stepCount++;
          logger.debug(`[${stepCount}] ${tool.name} called`);
          dashboard.log(`  {#6a6a8e-fg}[${stepCount}]{/#6a6a8e-fg} {#7fdbca-fg}${tool.name}{/#7fdbca-fg} …`);
          const result = await tool.execute(args);
          const icon = result.success ? '{green-fg}✓{/green-fg}' : '{red-fg}✗{/red-fg}';
          logger.debug(`[${stepCount}] ${tool.name} → ${result.success ? 'ok' : 'fail'}`);
          dashboard.log(`  {#6a6a8e-fg}[${stepCount}]{/#6a6a8e-fg} ${tool.name} → ${icon}`);
          if (result.error) {
            logger.warn(`[${stepCount}] ${tool.name} error: ${result.error}`);
            dashboard.log(`       {red-fg}${result.error}{/red-fg}`);
          }
          return result;
        },
      };
    }

    const tools = new Map<string, Tool>();
    tools.set('read_file', wrapTool(createReadFileTool(config.workingDirectory, config.fileReadMaxSize)));
    tools.set('search_directory', wrapTool(createSearchDirectoryTool(config.workingDirectory)));
    tools.set('edit_file', wrapTool(createEditFileTool(config.workingDirectory)));
    tools.set('shell', wrapTool(createShellTool(config.workingDirectory, config.shellTimeout)));

    const loop = new ReActLoop(connection.page, GeminiProtocol, parseResponse, sessionManager, tools, config);

    try {
      const result = await loop.run(prompt, sessionId);
      dashboard.log('');
      if (result.success) {
        logger.info(`Session ${sessionId} complete (${result.steps.length} steps)`);
        dashboard.log(`{green-fg}✓ Complete:{/green-fg} ${result.finalResponse}`);
      } else {
        logger.warn(`Session ${sessionId} failed: ${result.reason ?? 'unknown'}`);
        dashboard.log(`{red-fg}✗ Failed:{/red-fg} ${result.reason ?? result.finalResponse}`);
      }
      dashboard.log(`{#6a6a8e-fg}(${result.steps.length} steps){/#6a6a8e-fg}`);
    } catch (err) {
      logger.error(`Session ${sessionId} crashed: ${(err as Error).message}`);
      dashboard.log(`{red-fg}Error: ${(err as Error).message}{/red-fg}`);
    } finally {
      isRunning = false;
      dashboard.setInputEnabled(true);

      const updated = await sessionManager.list();
      dashboard.setSessions(updated);
      dashboard.focusPrompt();
    }
  }
}

async function openGeminiTab(port: number): Promise<void> {
  const res = await fetch(`http://localhost:${port}/json/new?https://gemini.google.com`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`CDP /json/new returned ${res.status}`);
}
