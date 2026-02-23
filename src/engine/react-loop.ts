// src/engine/react-loop.ts
// ReAct loop engine — orchestrates Reason→Act→Observe cycle with Gemini

import type { Page } from 'puppeteer-core';
import type { GeminiProtocol } from '../browser/protocol.js';
import { buildSystemPrompt } from '../prompts/system-prompt.js';
import type { SessionManager } from '../session/manager.js';
import type { AgentConfig, ReActResult, SessionState, Tool, ToolResult } from '../types/index.js';
import type { parseResponse } from './parser.js';

export class ReActLoop {
  private readonly page: Page;
  private readonly protocol: typeof GeminiProtocol;
  private readonly parser: typeof parseResponse;
  private readonly sessionManager: SessionManager;
  private readonly tools: Map<string, Tool>;
  private readonly config: AgentConfig;

  constructor(
    page: Page,
    protocol: typeof GeminiProtocol,
    parser: typeof parseResponse,
    sessionManager: SessionManager,
    tools: Map<string, Tool>,
    config: AgentConfig,
  ) {
    this.page = page;
    this.protocol = protocol;
    this.parser = parser;
    this.sessionManager = sessionManager;
    this.tools = tools;
    this.config = config;
  }

  async run(prompt: string, sessionId?: string): Promise<ReActResult> {
    const id = sessionId ?? Date.now().toString(36);

    const session: SessionState = {
      id,
      prompt,
      steps: [],
      config: {
        maxIterations: this.config.maxIterations,
        maxParseFailures: this.config.maxParseFailures,
      },
      createdAt: new Date().toISOString(),
      lastStepAt: new Date().toISOString(),
    };

    const systemPrompt = buildSystemPrompt({
      task: prompt,
      workingDirectory: this.config.workingDirectory,
    });

    await this.protocol.injectText(this.page, systemPrompt);
    await this.protocol.submitMessage(this.page);
    await this.protocol.waitForCompletion(this.page, this.config);

    let consecutiveParseFailures = 0;
    let consecutiveEmpty = 0;

    for (let i = 0; i < this.config.maxIterations; i++) {
      const responseText = await this.protocol.extractResponse(this.page);
      const parsed = this.parser(responseText);

      if (parsed.signals.taskComplete) {
        session.lastStepAt = new Date().toISOString();
        await this.sessionManager.save(session);
        return {
          success: true,
          steps: session.steps,
          sessionId: id,
          finalResponse: parsed.reasoning || responseText,
        };
      }

      if (parsed.signals.taskFailed) {
        session.lastStepAt = new Date().toISOString();
        await this.sessionManager.save(session);
        return {
          success: false,
          steps: session.steps,
          sessionId: id,
          finalResponse: parsed.reasoning || responseText,
          reason: parsed.signals.failureReason ?? 'Task failed (no reason given)',
        };
      }

      let observationText: string;

      if (parsed.toolCalls.length > 0) {
        consecutiveParseFailures = 0;
        consecutiveEmpty = 0;

        // Sequential execution only — never parallel
        const observations: string[] = [];
        for (const toolCall of parsed.toolCalls) {
          const result = await this.executeTool(toolCall.tool, toolCall.args);
          observations.push(this.formatObservation(toolCall.tool, result));

          session.steps.push({
            thought: parsed.reasoning,
            action: toolCall,
            observation: result,
            timestamp: Date.now(),
          });
        }

        observationText = observations.join('\n\n');
      } else {
        consecutiveParseFailures++;
        consecutiveEmpty++;

        if (consecutiveParseFailures >= this.config.maxParseFailures) {
          session.lastStepAt = new Date().toISOString();
          await this.sessionManager.save(session);
          return {
            success: false,
            steps: session.steps,
            sessionId: id,
            finalResponse: responseText,
            reason: `Aborted after ${consecutiveParseFailures} consecutive parse failures`,
          };
        }

        if (consecutiveEmpty >= 3) {
          observationText = 'Please respond with a tool call or TASK_COMPLETE/TASK_FAILED';
          consecutiveEmpty = 0;
        } else {
          observationText =
            'No valid tool calls detected in your response. Please use the correct JSON format to call a tool, or signal TASK_COMPLETE/TASK_FAILED.';
        }
      }

      // Session saved after EVERY iteration — mandatory invariant
      session.lastStepAt = new Date().toISOString();
      await this.sessionManager.save(session);

      await this.protocol.injectText(this.page, observationText);
      await this.protocol.submitMessage(this.page);
      await this.protocol.waitForCompletion(this.page, this.config);
    }

    session.lastStepAt = new Date().toISOString();
    await this.sessionManager.save(session);
    return {
      success: false,
      steps: session.steps,
      sessionId: id,
      finalResponse: `Loop reached maximum iterations (${this.config.maxIterations})`,
      reason: `Exceeded maxIterations (${this.config.maxIterations})`,
    };
  }

  private async executeTool(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        success: false,
        output: '',
        error: `Unknown tool: "${toolName}". Available tools: ${[...this.tools.keys()].join(', ')}`,
      };
    }

    try {
      return await tool.execute(args);
    } catch (err) {
      return {
        success: false,
        output: '',
        error: `Tool execution error: ${(err as Error).message}`,
      };
    }
  }

  private formatObservation(toolName: string, result: ToolResult): string {
    const lines = [`[Tool Result: ${toolName}]`, `Success: ${result.success}`, `Output:`, result.output || '(empty)'];
    if (result.error) {
      lines.push(`Error: ${result.error}`);
    }
    return lines.join('\n');
  }
}
