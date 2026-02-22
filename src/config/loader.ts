import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AgentConfig } from '../types/index.js';
import type { CliArgs } from './cli-args.js';
import { DEFAULT_CONFIG } from './schema.js';

export function loadConfig(cliArgs: CliArgs = {}): AgentConfig {
  // Layer 1: defaults
  const config: AgentConfig = { ...DEFAULT_CONFIG };

  // Layer 2: config file
  const configPath = cliArgs.config ?? '.cdp-agent.config.json';
  const resolvedConfigPath = resolve(process.cwd(), configPath);

  if (existsSync(resolvedConfigPath)) {
    try {
      const fileContent = readFileSync(resolvedConfigPath, 'utf-8');
      const fileConfig = JSON.parse(fileContent) as Record<string, unknown>;
      delete fileConfig._comment;
      Object.assign(config, fileConfig);
    } catch (e) {
      console.error(`Warning: Failed to parse config file ${resolvedConfigPath}:`, e);
    }
  }

  // Layer 3: CLI args override
  if (cliArgs.port !== undefined) config.cdpPort = cliArgs.port;
  if (cliArgs.launchChrome !== undefined) config.launchChrome = cliArgs.launchChrome;
  if (cliArgs.maxIterations !== undefined) config.maxIterations = cliArgs.maxIterations;
  if (cliArgs.workingDir !== undefined) config.workingDirectory = resolve(cliArgs.workingDir);
  if (cliArgs.verbose !== undefined) config.verbose = cliArgs.verbose;
  if (cliArgs.prompt !== undefined) config.prompt = cliArgs.prompt;
  if (cliArgs.session !== undefined) config.sessionName = cliArgs.session;
  if (cliArgs.resume !== undefined) config.resumeSession = cliArgs.resume;
  if (cliArgs.config !== undefined) config.configPath = cliArgs.config;

  return config;
}
