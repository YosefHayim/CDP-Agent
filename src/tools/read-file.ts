// src/tools/read-file.ts
// Read file tool — reads files with line numbers and size limits

import { existsSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import type { Tool, ToolResult } from '../types/index.js';

const MAX_FILE_SIZE = 102400; // 100KB default

/**
 * Validate that a path is within the working directory (security check).
 */
function validatePath(filePath: string, workingDir: string): string {
  const resolved = isAbsolute(filePath) ? filePath : resolve(workingDir, filePath);

  const rel = relative(workingDir, resolved);
  if (rel.startsWith('..')) {
    throw new Error(
      `Path "${filePath}" is outside the working directory "${workingDir}". ` +
        `File access is restricted to the working directory.`,
    );
  }

  return resolved;
}

/**
 * Check if a buffer contains binary content (null bytes).
 */
function isBinary(content: string): boolean {
  return content.includes('\0');
}

/**
 * Add line numbers to file content.
 */
function addLineNumbers(content: string): string {
  const lines = content.split('\n');
  const width = String(lines.length).length;
  return lines.map((line, i) => `${String(i + 1).padStart(width, ' ')}: ${line}`).join('\n');
}

export function createReadFileTool(workingDirectory: string, fileReadMaxSize = MAX_FILE_SIZE): Tool {
  return {
    name: 'read_file',
    description: 'Read a file and return its contents with line numbers. Paths are relative to the working directory.',

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const filePath = args.path as string;

      if (!filePath || typeof filePath !== 'string') {
        return {
          success: false,
          output: '',
          error: 'Missing required argument: path (string)',
        };
      }

      let resolvedPath: string;
      try {
        resolvedPath = validatePath(filePath, workingDirectory);
      } catch (e) {
        return {
          success: false,
          output: '',
          error: (e as Error).message,
        };
      }

      if (!existsSync(resolvedPath)) {
        return {
          success: false,
          output: '',
          error: `File not found: ${filePath}`,
        };
      }

      let content: string;
      try {
        // Use Bun.file for efficient reading
        const file = Bun.file(resolvedPath);
        const size = file.size;

        if (size > fileReadMaxSize) {
          // Read only up to the limit
          const buffer = await file.arrayBuffer();
          const decoder = new TextDecoder('utf-8', { fatal: false });
          content = decoder.decode(buffer.slice(0, fileReadMaxSize));

          if (isBinary(content)) {
            return {
              success: false,
              output: '',
              error: `File "${filePath}" appears to be binary. Only text files can be read.`,
            };
          }

          const numbered = addLineNumbers(content);
          return {
            success: true,
            output: `${numbered}\n\n[TRUNCATED at ${fileReadMaxSize} bytes (file is ${size} bytes). Use shell tool to read specific ranges.]`,
          };
        }

        content = await file.text();

        if (isBinary(content)) {
          return {
            success: false,
            output: '',
            error: `File "${filePath}" appears to be binary. Only text files can be read.`,
          };
        }
      } catch (e) {
        const err = e as NodeJS.ErrnoException;
        if (err.code === 'EACCES') {
          return {
            success: false,
            output: '',
            error: `Permission denied reading file: ${filePath}`,
          };
        }
        return {
          success: false,
          output: '',
          error: `Error reading file "${filePath}": ${err.message}`,
        };
      }

      return {
        success: true,
        output: addLineNumbers(content),
      };
    },
  };
}
