#!/usr/bin/env bun

import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { BrowserBridge } from './browser/index.js';
import { GeminiProtocol } from './browser/protocol.js';
import type { CliArgs } from './config/cli-args.js';
import { loadConfig } from './config/loader.js';
import { parseResponse } from './engine/parser.js';
import { ReActLoop } from './engine/react-loop.js';
import { SessionManager } from './session/manager.js';
import { createEditFileTool } from './tools/edit-file.js';
import { createReadFileTool } from './tools/read-file.js';
import { createSearchDirectoryTool } from './tools/search-directory.js';
import { createShellTool } from './tools/shell.js';
import type { AgentConfig, Tool } from './types/index.js';

// ── CLI Definition ──────────────────────────────────────────────────────

const program = new Command()
  .name('cdp-agent')
  .description('Autonomous coding agent powered by Gemini via Chrome DevTools Protocol')
  .version('0.1.3')
  .option('--prompt <text>', 'Task prompt for the agent')
  .option('--resume <id>', 'Resume a saved session by ID')
  .option('--session <id>', 'Session name/ID (auto-generated if omitted)')
  .option('--config <path>', 'Config file path')
  .option('--cdp-port <port>', 'Chrome debugging port (default: 9222)', parseInt)
  .option('--working-dir <path>', 'Working directory for file operations')
  .option('--check-connection', 'Test CDP connection and exit')
  .option('--list-sessions', 'List available sessions and exit')
  .option('--verbose', 'Enable debug logging');

program.parse();

interface CliOptions {
  prompt?: string;
  resume?: string;
  session?: string;
  config?: string;
  cdpPort?: number;
  workingDir?: string;
  checkConnection?: boolean;
  listSessions?: boolean;
  verbose?: boolean;
}

const opts = program.opts<CliOptions>();

// ── Config ──────────────────────────────────────────────────────────────

const cliArgs: CliArgs = {
  prompt: opts.prompt,
  port: opts.cdpPort,
  config: opts.config,
  session: opts.session,
  resume: opts.resume,
  checkConnection: opts.checkConnection,
  workingDir: opts.workingDir,
  verbose: opts.verbose,
};

const config = loadConfig(cliArgs);
const sessionManager = new SessionManager(config.sessionDir);

// ── SIGINT Handler ──────────────────────────────────────────────────────

let currentSessionId: string | undefined;
let activeSpinner: ReturnType<typeof ora> | undefined;
let isExiting = false;

process.on('SIGINT', () => {
  if (isExiting) return;
  isExiting = true;
  if (activeSpinner) activeSpinner.stop();
  console.log(`\n${chalk.yellow('⚠ Interrupted. Session saved.')}`);
  if (currentSessionId) {
    console.log(chalk.dim(`Resume with: cdp-agent --resume ${currentSessionId}`));
  }
  process.exit(0);
});

// ── Tool Wrappers ───────────────────────────────────────────────────────

let stepCount = 0;

function wrapTool(tool: Tool, spinner: ReturnType<typeof ora>): Tool {
  return {
    name: tool.name,
    description: tool.description,
    async execute(args: Record<string, unknown>) {
      stepCount++;
      spinner.stop();
      const result = await tool.execute(args);
      const status = result.success ? chalk.green('✓') : chalk.red('✗');
      console.log(`${chalk.dim(`[Step ${stepCount}]`)} ${chalk.cyan(tool.name)} → ${status}`);
      spinner.start('Thinking...');
      return result;
    },
  };
}

function buildTools(cfg: AgentConfig, spinner: ReturnType<typeof ora>): Map<string, Tool> {
  const tools = new Map<string, Tool>();
  tools.set('read_file', wrapTool(createReadFileTool(cfg.workingDirectory, cfg.fileReadMaxSize), spinner));
  tools.set('search_directory', wrapTool(createSearchDirectoryTool(cfg.workingDirectory), spinner));
  tools.set('edit_file', wrapTool(createEditFileTool(cfg.workingDirectory), spinner));
  tools.set('shell', wrapTool(createShellTool(cfg.workingDirectory, cfg.shellTimeout), spinner));
  return tools;
}

// ── Error Formatting ────────────────────────────────────────────────────

function formatConnectionError(err: Error, port: number): string {
  const msg = err.message;
  if (msg.includes('Cannot connect') || msg.includes('ECONNREFUSED')) {
    return `Failed to connect to Chrome on port ${port}. Is Chrome running with --remote-debugging-port=${port}?`;
  }
  if (msg.includes('No Gemini tab')) {
    return 'Connected to Chrome but no Gemini tab found. Open gemini.google.com first.';
  }
  return msg;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (opts.checkConnection) {
    const spinner = ora('Connecting to Chrome...').start();
    try {
      const bridge = new BrowserBridge(config);
      await bridge.connect();
      spinner.succeed(chalk.green(`Connected to Chrome on port ${config.cdpPort}`));
      console.log(chalk.green('Gemini tab found ✓'));
      await bridge.disconnect();
    } catch (err) {
      spinner.fail(chalk.red('Connection failed'));
      console.error(chalk.red(formatConnectionError(err as Error, config.cdpPort)));
      process.exit(1);
    }
    return;
  }

  if (opts.listSessions) {
    const sessions = await sessionManager.list();
    if (sessions.length === 0) {
      console.log(chalk.yellow('No saved sessions found.'));
      return;
    }
    console.log(chalk.cyan('Available sessions:\n'));
    for (const s of sessions) {
      const promptPreview = s.prompt.length > 60 ? `${s.prompt.slice(0, 57)}...` : s.prompt;
      console.log(
        `  ${chalk.bold(s.id)}  ${chalk.dim('|')}  ${s.stepCount} steps  ${chalk.dim('|')}  ${s.lastStepAt}  ${chalk.dim('|')}  "${promptPreview}"`,
      );
    }
    return;
  }

  let prompt: string;
  let sessionId: string;

  if (opts.resume) {
    const session = await sessionManager.load(opts.resume);
    if (!session) {
      console.error(chalk.red(`Session '${opts.resume}' not found. Use --list-sessions to see available sessions.`));
      process.exit(1);
    }
    prompt = session.prompt;
    sessionId = session.id;
    console.log(chalk.cyan(`Resuming session: ${sessionId}`));
    console.log(chalk.dim(`Original prompt: "${prompt}"`));
  } else if (opts.prompt) {
    prompt = opts.prompt;
    sessionId = opts.session ?? Date.now().toString(36);
  } else {
    console.error(chalk.red('Either --prompt or --resume is required.'));
    console.log(chalk.dim('Run with --help for usage information.'));
    process.exit(1);
  }

  currentSessionId = sessionId;

  const spinner = ora('Connecting to Chrome...').start();
  activeSpinner = spinner;

  let bridge: BrowserBridge;
  try {
    bridge = new BrowserBridge(config);
    await bridge.connect();
    spinner.succeed(chalk.green(`Connected to Chrome on port ${config.cdpPort}`));
  } catch (err) {
    spinner.fail(chalk.red('Connection failed'));
    console.error(chalk.red(formatConnectionError(err as Error, config.cdpPort)));
    process.exit(1);
  }

  const connection = bridge.getConnection();
  const tools = buildTools(config, spinner);

  const loop = new ReActLoop(connection.page, GeminiProtocol, parseResponse, sessionManager, tools, config);

  spinner.start('Thinking...');

  try {
    const result = await loop.run(prompt, sessionId);
    spinner.stop();
    currentSessionId = result.sessionId;

    if (result.success) {
      console.log(chalk.green(`✓ Task complete: ${result.finalResponse}`));
    } else {
      console.log(chalk.red(`✗ Task failed: ${result.reason ?? result.finalResponse}`));
    }

    console.log(chalk.dim(`Session: ${result.sessionId} (${result.steps.length} steps)`));
  } catch (err) {
    spinner.stop();
    console.error(chalk.red(`Error: ${(err as Error).message}`));
    process.exitCode = 1;
  } finally {
    await bridge.disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(chalk.red(`Fatal error: ${(err as Error).message}`));
  process.exit(1);
});
