import { BrowserBridge } from '../browser/index.js';
import { launchChrome } from '../browser/launch.js';
import { GeminiProtocol } from '../browser/protocol.js';
import { loadConfig } from '../config/loader.js';
import { parseResponse } from '../engine/parser.js';
import { ReActLoop } from '../engine/react-loop.js';
import { handleCDPDisconnect } from '../engine/recovery.js';
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
        if (!sessionId) return;
        logger.info(`Session selected: ${sessionId}`);
        loadSession(sessionId).catch((err: unknown) => {
          logger.error(`Session load failed: ${(err as Error).message}`);
          dashboard.log(`{red-fg}Failed to load session: ${(err as Error).message}{/red-fg}`);
        });
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

      onLaunchBrowser: () => {
        if (isRunning) return;
        reconnectBrowser().catch((err: unknown) => {
          logger.error(`Reconnect failed: ${(err as Error).message}`);
          dashboard.log(`{red-fg}Reconnect failed: ${(err as Error).message}{/red-fg}`);
        });
      },

      onNewConversation: () => {
        if (isRunning) {
          dashboard.log('{yellow-fg}Cannot start new conversation while agent is running{/yellow-fg}');
          return;
        }
        logger.info('New conversation — clearing output');
        dashboard.log('');
        dashboard.log('{#7fdbca-fg}━━━ New conversation ━━━{/#7fdbca-fg}');
        dashboard.log('');
        dashboard.setLastAgentResponse('');
        dashboard.focusPrompt();
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

      await new Promise((r) => setTimeout(r, 4000));
      instances = await scanCdpPorts();
    } catch (err) {
      logger.error(`Chrome launch failed: ${(err as Error).message}`, err as Error);
      dashboard.setStatus('{red-fg}✗ Chrome launch failed{/red-fg}');
      dashboard.log(`{red-fg}${(err as Error).message}{/red-fg}`);
      dashboard.log('');
      dashboard.log('Press {#7fdbca-fg}Ctrl+L{/#7fdbca-fg} to launch/reconnect Chrome.');
      dashboard.setInputEnabled(false);
    }
  }

  // ── Phase 2: Connect (Playwright handles Gemini tab discovery) ──────

  const target = instances.find((i) => i.hasGemini) ?? instances[0];

  if (!target) {
    dashboard.setStatus('{red-fg}✗ No Chrome found{/red-fg}');
    dashboard.log('{red-fg}Could not find or launch Chrome with CDP.{/red-fg}');
    dashboard.log('Press {#7fdbca-fg}Ctrl+L{/#7fdbca-fg} to retry.');
    dashboard.setInputEnabled(false);
  } else {
    config.cdpPort = target.port;
    dashboard.setStatus(`Connecting to Chrome:${target.port}…`);
    logger.info(`Connecting to Chrome on port ${target.port} (${target.tabs.length} tabs via HTTP)`);

    dashboard.setInputEnabled(false);
    try {
      logger.debug(`Connecting to Chrome on port ${target.port}`);
      dashboard.log(`{#6a6a8e-fg}Connecting via CDP WebSocket…{/#6a6a8e-fg}`);
      const pending = new BrowserBridge(config, { autoCreateGeminiTab: true });
      await pending.connect();
      bridge = pending;
      logger.debug(`Connected — page URL: ${bridge.getConnection().page.url()}`);
      dashboard.setStatus(`{green-fg}●{/green-fg} Chrome:${target.port} — Gemini ✓`);
      dashboard.log('');
      dashboard.log('{green-fg}✓ Connected to Chrome · Gemini tab ready{/green-fg}');
      dashboard.setInputEnabled(true);
      logger.info('Connected');
    } catch (err) {
      bridge = null;
      logger.error(`Connection failed: ${(err as Error).message}`, err as Error);
      dashboard.setStatus('{red-fg}✗ Connection failed{/red-fg}');
      dashboard.log(`{red-fg}Error: ${(err as Error).message}{/red-fg}`);
      dashboard.log('');
      dashboard.log('Press {#7fdbca-fg}Ctrl+L{/#7fdbca-fg} to retry browser connection.');
    }
  }

  // ── Phase 3: Load sessions & ready ──────────────────────────────────

  const sessions = await sessionManager.list();
  dashboard.setSessions(sessions);

  if (sessions.length > 0) {
    dashboard.log(`{#6a6a8e-fg}${sessions.length} previous session(s) loaded{/#6a6a8e-fg}`);
  }

  if (bridge) {
    dashboard.log('');
    dashboard.log(`Ready — type a prompt below to begin.  {#6a6a8e-fg}Log: ${logger.path}{/#6a6a8e-fg}`);
    dashboard.focusPrompt();
  }

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
        dashboard.setLastAgentResponse(result.finalResponse);
      } else {
        logger.warn(`Session ${sessionId} failed: ${result.reason ?? 'unknown'}`);
        dashboard.log(`{red-fg}✗ Failed:{/red-fg} ${result.reason ?? result.finalResponse}`);
        dashboard.setLastAgentResponse(result.reason ?? result.finalResponse);
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

  // ── Browser reconnect ─────────────────────────────────────────────

  async function reconnectBrowser(): Promise<void> {
    logger.info('Reconnecting browser');
    dashboard.setStatus('Reconnecting…');
    dashboard.log('{yellow-fg}Reconnecting to Chrome…{/yellow-fg}');

    if (bridge) {
      try {
        await handleCDPDisconnect(bridge, config);
        dashboard.setStatus(`{green-fg}●{/green-fg} Chrome:${config.cdpPort} — Gemini ✓`);
        dashboard.log('{green-fg}✓ Reconnected to Chrome{/green-fg}');
        dashboard.setInputEnabled(true);
        dashboard.focusPrompt();
        logger.info('Reconnected via handleCDPDisconnect');
        return;
      } catch (err) {
        logger.warn(`handleCDPDisconnect failed: ${(err as Error).message}`);
      }
    }

    logger.info('Falling back to full scan + connect');
    const instances = await scanCdpPorts();

    if (instances.length === 0) {
      dashboard.log('{yellow-fg}No Chrome found — launching…{/yellow-fg}');
      await launchChrome(DEFAULT_CDP_PORT, config.verbose);
      await new Promise((r) => setTimeout(r, 4000));
    }

    const fresh = await scanCdpPorts();
    const picked = fresh.find((i) => i.hasGemini) ?? fresh[0];

    if (!picked) {
      dashboard.setStatus('{red-fg}✗ No Chrome found{/red-fg}');
      dashboard.log('{red-fg}Could not find or launch Chrome{/red-fg}');
      return;
    }

    config.cdpPort = picked.port;
    const pending = new BrowserBridge(config, { autoCreateGeminiTab: true });
    await pending.connect();
    bridge = pending;
    dashboard.setStatus(`{green-fg}●{/green-fg} Chrome:${picked.port} — Gemini ✓`);
    dashboard.log('{green-fg}✓ Connected to Chrome{/green-fg}');
    dashboard.setInputEnabled(true);
    dashboard.focusPrompt();
    logger.info(`Reconnected to port ${picked.port}`);
  }

  // ── Session loader ────────────────────────────────────────────────

  async function loadSession(sessionId: string): Promise<void> {
    const state = await sessionManager.load(sessionId);
    if (!state) {
      dashboard.log(`{red-fg}Session ${sessionId} not found or corrupt{/red-fg}`);
      return;
    }

    dashboard.log('');
    dashboard.log(`{bold}━━━ Session: ${state.id} ━━━{/bold}`);
    dashboard.log(`{#6a6a8e-fg}Prompt:{/#6a6a8e-fg} ${state.prompt}`);
    dashboard.log(`{#6a6a8e-fg}Steps: ${state.steps.length}  Created: ${state.createdAt}{/#6a6a8e-fg}`);
    dashboard.log('');

    for (let i = 0; i < state.steps.length; i++) {
      const step = state.steps[i];
      const icon = step.observation.success ? '{green-fg}✓{/green-fg}' : '{red-fg}✗{/red-fg}';
      dashboard.log(`  {#6a6a8e-fg}[${i + 1}]{/#6a6a8e-fg} {#7fdbca-fg}${step.action.tool}{/#7fdbca-fg} → ${icon}`);

      if (step.thought) {
        const preview = step.thought.length > 120 ? `${step.thought.slice(0, 117)}…` : step.thought;
        dashboard.log(`       {#6a6a8e-fg}${preview}{/#6a6a8e-fg}`);
      }

      if (step.observation.error) {
        dashboard.log(`       {red-fg}${step.observation.error}{/red-fg}`);
      }
    }

    const lastStep = state.steps[state.steps.length - 1];
    if (lastStep?.observation.output) {
      const preview =
        lastStep.observation.output.length > 200
          ? `${lastStep.observation.output.slice(0, 197)}…`
          : lastStep.observation.output;
      dashboard.setLastAgentResponse(preview);
    }

    dashboard.log('');
    dashboard.log('{#6a6a8e-fg}End of session history{/#6a6a8e-fg}');
    dashboard.focusPrompt();
    logger.info(`Session ${sessionId} loaded (${state.steps.length} steps)`);
  }
}
