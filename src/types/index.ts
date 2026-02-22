// src/types/index.ts
// Single source of truth for all cdp-agent type definitions

// Browser / DOM types (re-exported from playwright-core)
type Browser = import('playwright-core').Browser;
type Page = import('playwright-core').Page;

// Tool system
export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface Tool {
  name: string;
  description: string;
  execute(args: Record<string, unknown>): Promise<ToolResult>;
}

// ReAct loop
export interface ReActStep {
  thought: string;
  action: ToolCall;
  observation: ToolResult;
  timestamp: number;
}

export interface ReActResult {
  success: boolean;
  steps: ReActStep[];
  sessionId: string;
  finalResponse: string;
  reason?: string;
}

// Memory and session
export interface MemorySummary {
  goal: string;
  filesModified: string[];
  keyDecisions: string[];
  currentStep: string;
}

export interface AgentConfig {
  cdpPort: number;
  maxIterations: number;
  maxParseFailures: number;
  shellTimeout: number;
  fileReadMaxSize: number;
  stabilityThreshold: number;
  stabilityPollingInterval: number;
  workingDirectory: string;
  sessionDir: string;
  verbose: boolean;
  prompt?: string;
  sessionName?: string;
  resumeSession?: string;
  configPath?: string;
  selectors?: Record<string, string[]>;
}

export interface SessionState {
  id: string;
  prompt: string;
  steps: ReActStep[];
  memorySummary?: MemorySummary;
  config: Partial<AgentConfig>;
  createdAt: string;
  lastStepAt: string;
}

export interface SessionInfo {
  id: string;
  prompt: string;
  createdAt: string;
  lastStepAt: string;
  stepCount: number;
}

// Browser / DOM
export interface SelectorChain {
  name: string;
  selectors: string[];
  description: string;
}

export interface BrowserConnection {
  browser: Browser;
  page: Page;
  connected: boolean;
}

export interface SelectorHealthResult {
  chain: SelectorChain;
  workingSelector: string | null;
  passed: boolean;
}

// Gemini communication
export interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

// Parser
export interface ParseResult {
  reasoning: string;
  toolCalls: ToolCall[];
  signals: {
    taskComplete: boolean;
    taskFailed: boolean;
    failureReason?: string;
  };
  raw: string;
}

// Context compression
export interface CompressedContext {
  preservedSteps: ReActStep[];
  memorySummary: MemorySummary;
}
