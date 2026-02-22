// src/tools/shell.ts
// Shell execution tool — runs commands with timeout and output capture

import type { Tool, ToolResult } from '../types/index.js';

const MAX_OUTPUT_SIZE = 102400; // 100KB
const DEFAULT_TIMEOUT = 120000; // 120 seconds

/**
 * Truncate output if it exceeds the size limit.
 */
function truncateOutput(output: string, maxSize: number): string {
  if (output.length <= maxSize) return output;
  return `${output.slice(0, maxSize)}\n\n[OUTPUT TRUNCATED at ${maxSize} bytes]`;
}

export function createShellTool(workingDirectory: string, shellTimeout = DEFAULT_TIMEOUT): Tool {
  return {
    name: 'shell',
    description: 'Execute a shell command and return stdout/stderr. Commands run in the working directory.',

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const command = args.command as string;

      if (!command || typeof command !== 'string') {
        return {
          success: false,
          output: '',
          error: 'Missing required argument: command (string)',
        };
      }

      let stdout = '';
      let stderr = '';
      let exitCode = 0;
      let timedOut = false;

      try {
        // Use Bun.spawn for process execution
        const proc = Bun.spawn(['sh', '-c', command], {
          cwd: workingDirectory,
          stdout: 'pipe',
          stderr: 'pipe',
        });

        // Set up timeout
        const timeoutId = setTimeout(() => {
          timedOut = true;
          proc.kill();
        }, shellTimeout);

        // Collect output
        const [stdoutText, stderrText] = await Promise.all([
          new Response(proc.stdout).text(),
          new Response(proc.stderr).text(),
        ]);

        await proc.exited;
        clearTimeout(timeoutId);

        stdout = stdoutText;
        stderr = stderrText;
        exitCode = proc.exitCode ?? 0;
      } catch (e) {
        if (timedOut) {
          return {
            success: false,
            output: '',
            error: `[COMMAND TIMED OUT after ${shellTimeout}ms]: ${command}`,
          };
        }
        return {
          success: false,
          output: '',
          error: `Failed to execute command: ${(e as Error).message}`,
        };
      }

      if (timedOut) {
        return {
          success: false,
          output: '',
          error: `[COMMAND TIMED OUT after ${shellTimeout}ms]: ${command}`,
        };
      }

      // Format output
      const parts: string[] = [];
      if (stdout) {
        parts.push(`STDOUT:\n${truncateOutput(stdout, MAX_OUTPUT_SIZE)}`);
      }
      if (stderr) {
        parts.push(`STDERR:\n${truncateOutput(stderr, MAX_OUTPUT_SIZE)}`);
      }
      parts.push(`EXIT CODE: ${exitCode}`);

      const output = parts.join('\n\n');

      return {
        success: exitCode === 0,
        output,
        error: exitCode !== 0 ? `Command exited with code ${exitCode}` : undefined,
      };
    },
  };
}
