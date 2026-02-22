import type { ParseResult, ToolCall } from '../types/index.js';

const JSON_BLOCK_RE = /```json\s*\n([\s\S]*?)\n```/g;
const TRAILING_COMMA_RE = /,\s*([}\]])/g;
const TASK_COMPLETE_RE = /TASK_COMPLETE/i;
const TASK_FAILED_RE = /TASK_FAILED(?:\s*[:：-]\s*)(.*)/i;
const TASK_FAILED_BARE_RE = /TASK_FAILED/i;

function isToolCall(value: unknown): value is ToolCall {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.tool === 'string' && typeof obj.args === 'object' && obj.args !== null;
}

function tryParseJSON(raw: string): unknown | undefined {
  try {
    return JSON.parse(raw);
  } catch {
    // Recovery: strip trailing commas and retry
    const cleaned = raw.replace(TRAILING_COMMA_RE, '$1');
    try {
      return JSON.parse(cleaned);
    } catch {
      return undefined;
    }
  }
}

export function parseResponse(text: string): ParseResult {
  const result: ParseResult = {
    reasoning: '',
    toolCalls: [],
    signals: {
      taskComplete: false,
      taskFailed: false,
    },
    raw: text,
  };

  const firstBlockIndex = text.indexOf('```json');
  if (firstBlockIndex > 0) {
    result.reasoning = text.slice(0, firstBlockIndex).trim();
  } else if (firstBlockIndex === -1) {
    result.reasoning = text.trim();
  }

  // Reset regex state for fresh exec
  JSON_BLOCK_RE.lastIndex = 0;
  let match = JSON_BLOCK_RE.exec(text);
  while (match !== null) {
    const jsonStr = match[1];
    const parsed = tryParseJSON(jsonStr);
    if (parsed !== undefined) {
      if (isToolCall(parsed)) {
        result.toolCalls.push(parsed);
      } else if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (isToolCall(item)) {
            result.toolCalls.push(item);
          }
        }
      }
    }
    match = JSON_BLOCK_RE.exec(text);
  }

  if (TASK_COMPLETE_RE.test(text)) {
    result.signals.taskComplete = true;
  }

  if (TASK_FAILED_BARE_RE.test(text)) {
    result.signals.taskFailed = true;
    const reasonMatch = TASK_FAILED_RE.exec(text);
    if (reasonMatch?.[1]) {
      const reason = reasonMatch[1].split('\n')[0].trim();
      if (reason.length > 0) {
        result.signals.failureReason = reason;
      }
    }
  }

  return result;
}
