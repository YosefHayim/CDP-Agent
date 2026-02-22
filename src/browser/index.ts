import type { AgentConfig, BrowserConnection } from '../types/index.js';
import { connect, disconnect, isConnected, runHealthCheck } from './connection.js';

export type { BrowserConnection } from '../types/index.js';
export {
  connect,
  disconnect,
  discoverEndpoint,
  findGeminiPage,
  isConnected,
} from './connection.js';
export {
  extractResponseText,
  findElement,
  healthCheck,
  waitForElement,
} from './selectors.js';

export class BrowserBridge {
  private connection: BrowserConnection | null = null;
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  async connect(): Promise<BrowserConnection> {
    this.connection = await connect(this.config);
    await runHealthCheck(this.connection, this.config.verbose);
    return this.connection;
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await disconnect(this.connection);
      this.connection = null;
    }
  }

  isConnected(): boolean {
    return this.connection !== null && isConnected(this.connection);
  }

  getConnection(): BrowserConnection {
    if (!this.connection) {
      throw new Error('Not connected. Call connect() first.');
    }
    return this.connection;
  }
}
