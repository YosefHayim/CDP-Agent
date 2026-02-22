import type { Page } from 'playwright-core';
import type { BrowserBridge } from '../browser/index.js';
import type { SessionManager } from '../session/manager.js';
import type { AgentConfig, SessionState } from '../types/index.js';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryOn?: (error: Error) => boolean;
}

export interface ErrorClassification {
  type: 'cdp_disconnect' | 'captcha' | 'rate_limit' | 'session_expired' | 'unknown';
  recoverable: boolean;
  message: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(fn: () => Promise<T>, config: RetryConfig): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === config.maxRetries) break;

      if (config.retryOn && !config.retryOn(lastError)) {
        throw lastError;
      }

      const delay = Math.min(config.baseDelayMs * 2 ** attempt, config.maxDelayMs);
      console.warn(`[recovery] Retry ${attempt + 1}/${config.maxRetries} after ${delay}ms: ${lastError.message}`);
      await sleep(delay);
    }
  }

  throw lastError!;
}

const CDP_PATTERNS = ['target closed', 'session closed', 'connection refused', 'protocol error', 'target crashed'];

const CAPTCHA_PATTERNS = ['unusual traffic', 'captcha', "verify you're human"];

const RATE_LIMIT_PATTERNS = ['too many requests', 'rate limit', '429'];

const SESSION_EXPIRED_PATTERNS = ['session expired', 'sign in', 'login required'];

export function detectRecoverableError(error: Error): ErrorClassification {
  const msg = error.message.toLowerCase();

  if (CDP_PATTERNS.some((p) => msg.includes(p))) {
    return {
      type: 'cdp_disconnect',
      recoverable: true,
      message: error.message,
    };
  }

  if (CAPTCHA_PATTERNS.some((p) => msg.includes(p))) {
    return {
      type: 'captcha',
      recoverable: false,
      message: 'CAPTCHA detected. Please solve it manually and retry.',
    };
  }

  if (RATE_LIMIT_PATTERNS.some((p) => msg.includes(p))) {
    return {
      type: 'rate_limit',
      recoverable: false,
      message: 'Rate limited. Wait and retry.',
    };
  }

  if (SESSION_EXPIRED_PATTERNS.some((p) => msg.includes(p))) {
    return {
      type: 'session_expired',
      recoverable: false,
      message: 'Gemini session expired. Re-login and retry.',
    };
  }

  return { type: 'unknown', recoverable: false, message: error.message };
}

export async function handleCDPDisconnect(bridge: BrowserBridge, config: AgentConfig): Promise<Page> {
  return withRetry(
    async () => {
      if (config.verbose) {
        console.warn('[recovery] Attempting CDP reconnection...');
      }
      await bridge.disconnect();
      const connection = await bridge.connect();
      return connection.page;
    },
    { maxRetries: 3, baseDelayMs: 2000, maxDelayMs: 16000 },
  );
}

export class RecoveryMiddleware {
  constructor(
    private readonly bridge: BrowserBridge,
    private readonly sessionManager: SessionManager,
    private readonly config: AgentConfig,
  ) {}

  async executeWithRecovery(step: () => Promise<void>, session: SessionState): Promise<void> {
    try {
      await step();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const classification = detectRecoverableError(error);

      if (classification.recoverable) {
        console.warn(`[recovery] Recoverable error (${classification.type}): ${error.message}`);
        await handleCDPDisconnect(this.bridge, this.config);

        await step();
      } else {
        console.error(`[recovery] Non-recoverable error (${classification.type}): ${classification.message}`);
        // Emergency save before throwing — never lose session data
        await this.sessionManager.save(session);
        throw error;
      }
    }
  }
}
