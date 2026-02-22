// src/tools/edit-file.ts
// Edit file tool — applies unified diffs with atomic writes

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { applyPatch } from 'diff';
import type { Tool, ToolResult } from '../types/index.js';

/**
 * Validate that a path is within the working directory.
 */
function validatePath(filePath: string, workingDir: string): string {
  const resolved = isAbsolute(filePath) ? filePath : resolve(workingDir, filePath);

  const rel = relative(workingDir, resolved);
  if (rel.startsWith('..')) {
    throw new Error(
      `Path "${filePath}" is outside the working directory. File writes are restricted to the working directory.`,
    );
  }

  return resolved;
}

/**
 * Atomically write content to a file (write temp → rename).
 */
function atomicWrite(filePath: string, content: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  writeFileSync(tmpPath, content, 'utf-8');
  renameSync(tmpPath, filePath);
}

export function createEditFileTool(workingDirectory: string): Tool {
  return {
    name: 'edit_file',
    description:
      'Apply a unified diff to edit a file. Use standard unified diff format (--- a/file, +++ b/file, @@ hunks). For new files, provide the full content as the diff.',

    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const filePath = args.path as string;
      const diffContent = args.diff as string;

      if (!filePath || typeof filePath !== 'string') {
        return { success: false, output: '', error: 'Missing required argument: path (string)' };
      }
      if (!diffContent || typeof diffContent !== 'string') {
        return { success: false, output: '', error: 'Missing required argument: diff (string)' };
      }

      let resolvedPath: string;
      try {
        resolvedPath = validatePath(filePath, workingDirectory);
      } catch (e) {
        return { success: false, output: '', error: (e as Error).message };
      }

      const isUnifiedDiff = diffContent.includes('--- ') && diffContent.includes('+++ ') && diffContent.includes('@@ ');

      if (!isUnifiedDiff) {
        try {
          atomicWrite(resolvedPath, diffContent);
          return {
            success: true,
            output: `File created/overwritten: ${filePath} (${diffContent.length} bytes)`,
          };
        } catch (e) {
          return { success: false, output: '', error: `Failed to write file: ${(e as Error).message}` };
        }
      }

      let originalContent = '';
      if (existsSync(resolvedPath)) {
        try {
          originalContent = readFileSync(resolvedPath, 'utf-8');
        } catch (e) {
          return { success: false, output: '', error: `Cannot read file for patching: ${(e as Error).message}` };
        }
      }

      const patched = applyPatch(originalContent, diffContent);

      if (patched === false) {
        const lines = diffContent.split('\n');
        const hunkHeaders = lines.filter((l) => l.startsWith('@@'));
        return {
          success: false,
          output: '',
          error: [
            `Failed to apply diff to "${filePath}".`,
            `The patch context lines don't match the current file content.`,
            `Hunks attempted: ${hunkHeaders.join(', ')}`,
            `Tip: Read the current file first, then generate a diff based on the actual content.`,
          ].join('\n'),
        };
      }

      const addedLines = diffContent.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
      const removedLines = diffContent.split('\n').filter((l) => l.startsWith('-') && !l.startsWith('---')).length;

      try {
        atomicWrite(resolvedPath, patched);
      } catch (e) {
        return { success: false, output: '', error: `Failed to write patched file: ${(e as Error).message}` };
      }

      return {
        success: true,
        output: `File patched successfully: ${filePath} (+${addedLines} lines, -${removedLines} lines)`,
      };
    },
  };
}
