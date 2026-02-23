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
export { getChromePath, launchChrome } from './launch.js';
export {
  extractResponseText,
  findElement,
  healthCheck,
  waitForElement,
} from './selectors.js';

export interface BridgeOptions {
  autoCreateGeminiTab?: boolean;
}

export class BrowserBridge {
  private connection: BrowserConnection | null = null;
  private config: AgentConfig;
  private options: BridgeOptions;

  constructor(config: AgentConfig, options: BridgeOptions = {}) {
    this.config = config;
    this.options = options;
  }

  async connect(): Promise<BrowserConnection> {
    this.connection = await connect(this.config, this.options.autoCreateGeminiTab);
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
