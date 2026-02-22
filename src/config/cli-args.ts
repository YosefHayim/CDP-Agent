import { Command } from 'commander';

export interface CliArgs {
  prompt?: string;
  port?: number;
  config?: string;
  session?: string;
  resume?: string;
  checkConnection?: boolean;
  maxIterations?: number;
  workingDir?: string;
  verbose?: boolean;
}

export function parseCliArgs(argv: string[] = process.argv): CliArgs {
  const program = new Command();

  program
    .name('cdp-agent')
    .description('Autonomous code agent via Chrome DevTools Protocol + Gemini Web UI')
    .version('0.1.3')
    .option('--prompt <text>', 'Initial task prompt for the agent')
    .option('--port <number>', 'CDP port number (default: 9222)', parseInt)
    .option('--config <path>', 'Path to custom config file')
    .option('--session <name>', 'Session name for persistence')
    .option('--resume <name>', 'Resume a saved session by name')
    .option('--check-connection', 'Test CDP connection and exit')
    .option('--max-iterations <n>', 'Override max ReAct loop iterations', parseInt)
    .option('--working-dir <path>', 'Override working directory')
    .option('--verbose', 'Enable verbose logging');

  program.parse(argv);
  const opts = program.opts();

  return {
    prompt: opts.prompt,
    port: opts.port,
    config: opts.config,
    session: opts.session,
    resume: opts.resume,
    checkConnection: opts.checkConnection,
    maxIterations: opts.maxIterations,
    workingDir: opts.workingDir,
    verbose: opts.verbose,
  };
}
