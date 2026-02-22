import type { Widgets } from 'blessed';
import blessed from 'blessed';
import type { SessionInfo } from '../types/index.js';
import type { Logger } from './logger.js';

interface KeyEvent {
  name: string;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  full: string;
}

export interface DashboardCallbacks {
  onPromptSubmit: (prompt: string) => void;
  onSessionSelect: (sessionId: string | null) => void;
  onQuit: () => void;
}

export class Dashboard {
  private screen: Widgets.Screen;
  private statusBar: Widgets.BoxElement;
  private sessionList: Widgets.ListElement;
  private outputLog: Widgets.Log;
  private promptBox: Widgets.BoxElement;
  private callbacks: DashboardCallbacks;
  private logger: Logger | undefined;
  private sessions: SessionInfo[] = [];
  private inputEnabled = true;
  private inputBuffer = '';

  constructor(callbacks: DashboardCallbacks, logger?: Logger) {
    this.callbacks = callbacks;
    this.logger = logger;

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'CDP Agent',
      fullUnicode: true,
    });

    // ── Status bar (top) ──────────────────────────────────────────────
    this.statusBar = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      content: ' {bold}CDP Agent{/bold} {|}Initializing… ',
      style: { fg: 'white', bg: '#1a1a2e' },
    });

    // ── Session sidebar (left) ────────────────────────────────────────
    this.sessionList = blessed.list({
      parent: this.screen,
      top: 1,
      left: 0,
      width: '22%',
      height: '100%-4',
      border: { type: 'line' },
      label: ' Sessions ',
      keys: true,
      vi: true,
      mouse: true,
      tags: true,
      items: ['{green-fg}+ New{/green-fg}'],
      style: {
        selected: { fg: '#1a1a2e', bg: '#7fdbca' },
        border: { fg: '#3d3d5c' },
        item: { fg: '#c3c3e5' },
      },
    });

    // ── Output panel (main area) ──────────────────────────────────────
    this.outputLog = blessed.log({
      parent: this.screen,
      top: 1,
      left: '22%',
      width: '78%',
      height: '100%-4',
      border: { type: 'line' },
      label: ' Output ',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: { ch: '▐', style: { fg: '#7fdbca' } },
      style: {
        fg: '#e0e0e0',
        border: { fg: '#3d3d5c' },
      },
    });

    // ── Prompt (bottom) — manual key handling avoids blessed double-keystroke bug
    this.promptBox = blessed.box({
      parent: this.screen,
      bottom: 1,
      left: 0,
      width: '100%',
      height: 3,
      border: { type: 'line' },
      label: ' > Prompt ',
      tags: true,
      content: '{#3d3d5c-fg}Type a prompt…{/#3d3d5c-fg}',
      style: {
        fg: '#e0e0e0',
        border: { fg: '#7fdbca' },
      },
    });

    // ── Help bar (bottom-most) ────────────────────────────────────────
    blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      content:
        ' {#7fdbca-fg}Tab{/#7fdbca-fg} Switch  {#7fdbca-fg}Enter{/#7fdbca-fg} Submit  {#7fdbca-fg}↑↓{/#7fdbca-fg} Sessions  {#7fdbca-fg}Ctrl+C{/#7fdbca-fg} Exit',
      style: { fg: '#6a6a8e', bg: '#0f0f1a' },
    });

    this.setupKeybindings();
    this.promptBox.focus();
    this.screen.render();
  }

  // ── Key & event bindings ──────────────────────────────────────────────

  private setupKeybindings(): void {
    this.screen.key(['C-c'], () => this.callbacks.onQuit());

    this.screen.key(['tab'], () => {
      if (this.screen.focused === this.sessionList) {
        this.promptBox.focus();
        this.highlightActive('prompt');
      } else {
        this.sessionList.focus();
        this.highlightActive('sessions');
      }
      this.screen.render();
    });

    this.sessionList.on('select', (_item: Widgets.BlessedElement, index: number) => {
      if (index === 0) {
        this.callbacks.onSessionSelect(null);
      } else if (this.sessions[index - 1]) {
        this.callbacks.onSessionSelect(this.sessions[index - 1].id);
      }
      this.promptBox.focus();
      this.highlightActive('prompt');
      this.screen.render();
    });

    this.screen.on('keypress', (ch: string | undefined, key: KeyEvent) => {
      if (this.screen.focused !== this.promptBox) return;
      if (!this.inputEnabled) return;

      if (key.full === 'return' || key.full === 'enter') {
        this.handleSubmit();
        return;
      }

      if (key.full === 'backspace' || key.full === 'delete') {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        this.renderPrompt();
        return;
      }

      if (key.ctrl || key.meta || !ch) return;
      if (key.full === 'escape' || key.full === 'tab') return;

      this.inputBuffer += ch;
      this.renderPrompt();
    });
  }

  private handleSubmit(): void {
    const value = this.inputBuffer.trim();
    if (!value) return;

    this.logger?.info(`Prompt: ${value}`);
    this.callbacks.onPromptSubmit(value);
    this.inputBuffer = '';
    this.renderPrompt();
  }

  private renderPrompt(): void {
    if (this.inputBuffer.length === 0) {
      this.promptBox.setContent('{#3d3d5c-fg}Type a prompt…{/#3d3d5c-fg}');
    } else {
      this.promptBox.setContent(`${this.inputBuffer}{#7fdbca-fg}▌{/#7fdbca-fg}`);
    }
    this.screen.render();
  }

  private highlightActive(panel: 'sessions' | 'prompt'): void {
    if (panel === 'sessions') {
      this.sessionList.style.border = { fg: '#7fdbca' };
      this.promptBox.style.border = { fg: '#3d3d5c' };
    } else {
      this.sessionList.style.border = { fg: '#3d3d5c' };
      this.promptBox.style.border = { fg: '#7fdbca' };
    }
  }

  // ── Public API ────────────────────────────────────────────────────────

  setStatus(text: string): void {
    this.statusBar.setContent(` {bold}CDP Agent{/bold} {|}${text} `);
    this.screen.render();
  }

  log(text: string): void {
    this.outputLog.log(text);
    this.logger?.debug(`[UI] ${text.replace(/\{[^}]+\}/g, '')}`);
    this.screen.render();
  }

  setSessions(sessions: SessionInfo[]): void {
    this.sessions = sessions;
    const items = [
      '{green-fg}+ New{/green-fg}',
      ...sessions.map((s) => {
        const preview = s.prompt.length > 20 ? `${s.prompt.slice(0, 17)}…` : s.prompt;
        return `{#6a6a8e-fg}${s.id.slice(0, 6)}{/#6a6a8e-fg} ${preview}`;
      }),
    ];
    this.sessionList.setItems(items);
    this.screen.render();
  }

  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
    this.promptBox.setLabel(enabled ? ' > Prompt ' : ' ⏳ Running… ');
    if (enabled) this.renderPrompt();
    this.screen.render();
  }

  focusPrompt(): void {
    this.promptBox.focus();
    this.highlightActive('prompt');
    this.screen.render();
  }

  destroy(): void {
    this.screen.destroy();
  }
}
