import { describe, expect, it } from 'bun:test';
import { parseResponse } from '../engine/parser.js';

describe('parseResponse', () => {
  it('extracts a single tool call from json block', () => {
    const text = ['I need to read the file.', '```json', '{"tool":"read_file","args":{"path":"foo.ts"}}', '```'].join(
      '\n',
    );
    const result = parseResponse(text);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].tool).toBe('read_file');
    expect(result.toolCalls[0].args).toEqual({ path: 'foo.ts' });
    expect(result.reasoning).toBe('I need to read the file.');
  });

  it('extracts multiple tool calls from separate json blocks', () => {
    const text = [
      'Reading files.',
      '```json',
      '{"tool":"read_file","args":{"path":"a.ts"}}',
      '```',
      'Now another.',
      '```json',
      '{"tool":"read_file","args":{"path":"b.ts"}}',
      '```',
    ].join('\n');
    const result = parseResponse(text);
    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls[0].args).toEqual({ path: 'a.ts' });
    expect(result.toolCalls[1].args).toEqual({ path: 'b.ts' });
  });

  it('extracts tool calls from a JSON array block', () => {
    const text = [
      'Multiple calls.',
      '```json',
      '[{"tool":"read_file","args":{"path":"x.ts"}},{"tool":"shell","args":{"command":"ls"}}]',
      '```',
    ].join('\n');
    const result = parseResponse(text);
    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls[0].tool).toBe('read_file');
    expect(result.toolCalls[1].tool).toBe('shell');
  });

  it('recovers from trailing comma in JSON', () => {
    const text = ['```json', '{"tool":"shell","args":{"command":"ls",}}', '```'].join('\n');
    const result = parseResponse(text);
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].tool).toBe('shell');
  });

  it('detects TASK_COMPLETE signal', () => {
    const text = 'All done. TASK_COMPLETE';
    const result = parseResponse(text);
    expect(result.signals.taskComplete).toBe(true);
    expect(result.signals.taskFailed).toBe(false);
  });

  it('detects TASK_FAILED signal with reason', () => {
    const text = 'Cannot proceed. TASK_FAILED: Missing dependency xyz';
    const result = parseResponse(text);
    expect(result.signals.taskFailed).toBe(true);
    expect(result.signals.failureReason).toBe('Missing dependency xyz');
  });

  it('handles pure reasoning without tool calls', () => {
    const text = 'Let me think about this problem carefully.\nI should consider multiple approaches.';
    const result = parseResponse(text);
    expect(result.toolCalls).toHaveLength(0);
    expect(result.reasoning).toContain('think about this problem');
    expect(result.signals.taskComplete).toBe(false);
    expect(result.signals.taskFailed).toBe(false);
  });

  it('handles empty input without crashing', () => {
    const result = parseResponse('');
    expect(result.toolCalls).toHaveLength(0);
    expect(result.reasoning).toBe('');
    expect(result.signals.taskComplete).toBe(false);
    expect(result.signals.taskFailed).toBe(false);
    expect(result.raw).toBe('');
  });
});
