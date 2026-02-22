// src/tools/search-directory.ts
// Search directory tool — glob search with gitignore support

import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import fg from 'fast-glob';
import type { Tool, ToolResult } from '../types/index.js';

const MAX_RESULTS = 200;

// Default directories to always ignore
const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/coverage/**',
  '**/.cache/**',
];

/**
 * Read .gitignore patterns from the search directory.
 */
function readGitignorePatterns(searchDir: string): string[] {
  const gitignorePath = resolve(searchDir, '.gitignore');
  if (!existsSync(gitignorePath)) return [];

  try {
    const content = readFileSync(gitignorePath, 'utf-8');
    return content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((pattern) => {
        // Convert gitignore patterns to fast-glob patterns
        if (pattern.endsWith('/')) {
          return `**/${pattern}**`;
        }
        return `**/${pattern}`;
      });
  } catch {
    return [];
  }
}

export function createSearchDirectoryTool(workingDirectory: string): Tool {
  return {
    name: 'search_directory',
    description: 'Search for files matching a glob pattern. Respects .gitignore and excludes node_modules.',

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const pattern = args.pattern as string;
      const searchPath = (args.path as string | undefined) ?? '.';

      if (!pattern || typeof pattern !== 'string') {
        return {
          success: false,
          output: '',
          error: 'Missing required argument: pattern (string)',
        };
      }

      // Resolve search directory
      const searchDir = resolve(workingDirectory, searchPath);

      if (!existsSync(searchDir)) {
        return {
          success: false,
          output: '',
          error: `Search path does not exist: ${searchPath}`,
        };
      }

      // Build ignore patterns
      const gitignorePatterns = readGitignorePatterns(workingDirectory);
      const ignorePatterns = [...DEFAULT_IGNORE, ...gitignorePatterns];

      let matches: string[];
      try {
        matches = await fg(pattern, {
          cwd: searchDir,
          ignore: ignorePatterns,
          dot: false,
          onlyFiles: false,
          followSymbolicLinks: false,
        });
      } catch (e) {
        return {
          success: false,
          output: '',
          error: `Search failed: ${(e as Error).message}`,
        };
      }

      const total = matches.length;
      const limited = matches.slice(0, MAX_RESULTS);

      // Return paths relative to working directory
      const relativePaths = limited.map((match) => {
        const absPath = resolve(searchDir, match);
        return relative(workingDirectory, absPath);
      });

      if (relativePaths.length === 0) {
        return {
          success: true,
          output: `No files found matching pattern "${pattern}" in "${searchPath}"`,
        };
      }

      let output = relativePaths.join('\n');
      if (total > MAX_RESULTS) {
        output += `\n\n[${total} matches found, showing first ${MAX_RESULTS}]`;
      } else {
        output += `\n\n[${total} file(s) found]`;
      }

      return {
        success: true,
        output,
      };
    },
  };
}
