import { execSync } from 'node:child_process';
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
  onLaunchBrowser: () => void;
  onNewConversation: () => void;
}

export class Dashboard {
  private screen: Widgets.Screen;
  private statusBar: Widgets.BoxElement;
  private sessionList: Widgets.ListElement;
  private outputLog: Widgets.Log;
  private promptBox: Widgets.BoxElement;
  private searchOverlay: Widgets.BoxElement;
  private callbacks: DashboardCallbacks;
  private logger: Logger | undefined;
  private sessions: SessionInfo[] = [];
  private inputEnabled = true;
  private inputBuffer = '';

  // ── Message tracking ────────────────────────────────────────────────
  private outputLines: string[] = [];
  private plainLines: string[] = [];
  private lastAgentResponse = '';

  // ── Search state ────────────────────────────────────────────────────
  private searchActive = false;
  private searchBuffer = '';

  // ── Status bar restore ──────────────────────────────────────────────
  private savedStatus = '';
  private statusRestoreTimer: ReturnType<typeof setTimeout> | null = null;

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
        ' {#7fdbca-fg}Tab{/#7fdbca-fg} Switch  {#7fdbca-fg}Enter{/#7fdbca-fg} Submit  {#7fdbca-fg}↑↓{/#7fdbca-fg} Nav  {#7fdbca-fg}Ctrl+F{/#7fdbca-fg} Find  {#7fdbca-fg}Ctrl+Y{/#7fdbca-fg} Copy  {#7fdbca-fg}Ctrl+L{/#7fdbca-fg} Browser  {#7fdbca-fg}Ctrl+N{/#7fdbca-fg} New  {#7fdbca-fg}Ctrl+C{/#7fdbca-fg} Exit',
      style: { fg: '#6a6a8e', bg: '#0f0f1a' },
    });

    // ── Search overlay (hidden by default) ────────────────────────────
    this.searchOverlay = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: '60%',
      height: 3,
      border: { type: 'line' },
      label: ' Find (Esc to close) ',
      tags: true,
      hidden: true,
      content: '{#3d3d5c-fg}Type to search…{/#3d3d5c-fg}',
      style: {
        fg: '#e0e0e0',
        bg: '#1a1a2e',
        border: { fg: '#7fdbca' },
      },
    });

    this.setupKeybindings();
    this.promptBox.focus();
    this.screen.render();
    this.logger?.debug('Dashboard: initialized');
  }

  // ── Key & event bindings ──────────────────────────────────────────────

  private setupKeybindings(): void {
    // Centralised keypress handler — avoids blessed widgets swallowing events
    this.screen.on('keypress', (ch: string | undefined, key: KeyEvent) => {
      this.logger?.debug(`KEY: name=${key.name} full=${key.full} ctrl=${key.ctrl} ch=${ch ?? 'nil'}`);

      // ── Global shortcuts (always active) ──────────────────────────────
      if (key.full === 'C-c') {
        this.logger?.debug('Action: quit');
        this.callbacks.onQuit();
        return;
      }

      // ── Search mode routing ───────────────────────────────────────────
      if (this.searchActive) {
        this.handleSearchKey(ch, key);
        return;
      }

      // ── Global feature shortcuts ──────────────────────────────────────
      if (key.full === 'C-f') {
        this.logger?.debug('Action: open search overlay');
        this.openSearch();
        return;
      }

      if (key.full === 'C-y') {
        this.logger?.debug('Action: copy last response');
        this.copyLastResponse();
        return;
      }

      if (key.full === 'C-l') {
        this.logger?.debug('Action: launch browser');
        this.callbacks.onLaunchBrowser();
        return;
      }

      if (key.full === 'C-n') {
        this.logger?.debug('Action: new conversation');
        this.callbacks.onNewConversation();
        return;
      }

      if (key.full === 'tab') {
        if (this.screen.focused === this.sessionList) {
          this.promptBox.focus();
          this.highlightActive('prompt');
          this.logger?.debug('Focus: prompt');
        } else {
          this.sessionList.focus();
          this.highlightActive('sessions');
          this.logger?.debug('Focus: sessions');
        }
        this.screen.render();
        return;
      }

      // ── Session list focused ──────────────────────────────────────────
      if (this.screen.focused === this.sessionList) {
        if (key.full === 'up' || key.full === 'k') {
          this.sessionList.up(1);
          this.screen.render();
          return;
        }
        if (key.full === 'down' || key.full === 'j') {
          this.sessionList.down(1);
          this.screen.render();
          return;
        }
        if (key.full === 'return' || key.full === 'enter') {
          const index = (this.sessionList as unknown as { selected: number }).selected;
          if (index === 0) {
            this.callbacks.onSessionSelect(null);
          } else if (this.sessions[index - 1]) {
            this.callbacks.onSessionSelect(this.sessions[index - 1].id);
          }
          this.promptBox.focus();
          this.highlightActive('prompt');
          this.logger?.debug('Focus: prompt (after session select)');
          this.screen.render();
          return;
        }
        return;
      }

      // ── Prompt focused ────────────────────────────────────────────────
      if (this.screen.focused === this.promptBox) {
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
        if (key.full === 'escape') return;

        this.inputBuffer += ch;
        this.renderPrompt();
      }
    });
  }

  // ── Search overlay logic ──────────────────────────────────────────────

  private openSearch(): void {
    this.searchActive = true;
    this.searchBuffer = '';
    this.searchOverlay.setLabel(' Find (Esc to close) ');
    this.searchOverlay.setContent('{#3d3d5c-fg}Type to search…{/#3d3d5c-fg}');
    this.searchOverlay.show();
    this.searchOverlay.setFront();
    this.screen.render();
    this.logger?.debug('Search: overlay shown');
  }

  private closeSearch(): void {
    this.searchActive = false;
    this.searchBuffer = '';
    this.searchOverlay.hide();
    this.promptBox.focus();
    this.highlightActive('prompt');
    this.screen.render();
    this.logger?.debug('Search: overlay hidden');
  }

  private handleSearchKey(ch: string | undefined, key: KeyEvent): void {
    if (key.full === 'escape') {
      this.closeSearch();
      return;
    }

    if (key.full === 'return' || key.full === 'enter') {
      this.jumpToNextMatch();
      return;
    }

    if (key.full === 'backspace' || key.full === 'delete') {
      this.searchBuffer = this.searchBuffer.slice(0, -1);
      this.updateSearch();
      return;
    }

    if (key.ctrl || key.meta || !ch) return;

    this.searchBuffer += ch;
    this.updateSearch();
  }

  private updateSearch(): void {
    if (this.searchBuffer.length === 0) {
      this.searchOverlay.setLabel(' Find (Esc to close) ');
      this.searchOverlay.setContent('{#3d3d5c-fg}Type to search…{/#3d3d5c-fg}');
      this.screen.render();
      return;
    }

    const query = this.searchBuffer.toLowerCase();
    const matchIndices: number[] = [];
    for (let i = 0; i < this.plainLines.length; i++) {
      if (this.plainLines[i].toLowerCase().includes(query)) {
        matchIndices.push(i);
      }
    }

    const count = matchIndices.length;
    this.searchOverlay.setLabel(` Found ${count} match${count === 1 ? '' : 'es'} (Esc to close) `);
    this.searchOverlay.setContent(`${this.searchBuffer}{#7fdbca-fg}▌{/#7fdbca-fg}`);

    if (matchIndices.length > 0) {
      this.outputLog.scrollTo(matchIndices[0]);
    }

    this.screen.render();
    this.logger?.debug(`Search: query="${this.searchBuffer}" matches=${count}`);
  }

  private jumpToNextMatch(): void {
    if (this.searchBuffer.length === 0) return;

    const query = this.searchBuffer.toLowerCase();
    const currentScroll = (this.outputLog as unknown as { childBase: number }).childBase ?? 0;
    let firstMatch = -1;
    let nextMatch = -1;

    for (let i = 0; i < this.plainLines.length; i++) {
      if (this.plainLines[i].toLowerCase().includes(query)) {
        if (firstMatch === -1) firstMatch = i;
        if (i > currentScroll && nextMatch === -1) {
          nextMatch = i;
        }
      }
    }

    const target = nextMatch !== -1 ? nextMatch : firstMatch;
    if (target !== -1) {
      this.outputLog.scrollTo(target);
      this.screen.render();
      this.logger?.debug(`Search: jumped to line ${target}`);
    }
  }

  // ── Clipboard copy ────────────────────────────────────────────────────

  private copyLastResponse(): void {
    if (!this.lastAgentResponse) {
      this.showTemporaryStatus('Nothing to copy');
      this.logger?.debug('Clipboard: nothing to copy');
      return;
    }

    const plain = this.stripTags(this.lastAgentResponse);
    try {
      const platform = process.platform;
      if (platform === 'darwin') {
        execSync('pbcopy', { input: plain });
      } else {
        execSync('xclip -selection clipboard', { input: plain });
      }
      this.showTemporaryStatus('Copied to clipboard');
      this.logger?.debug(`Clipboard: copied ${plain.length} chars`);
    } catch {
      this.showTemporaryStatus('Copy failed');
      this.logger?.debug('Clipboard: copy failed');
    }
  }

  private showTemporaryStatus(message: string): void {
    if (this.statusRestoreTimer) {
      clearTimeout(this.statusRestoreTimer);
    }
    this.savedStatus = this.statusBar.getContent();
    this.statusBar.setContent(` {bold}CDP Agent{/bold} {|}${message} `);
    this.screen.render();
    this.statusRestoreTimer = setTimeout(() => {
      this.statusBar.setContent(this.savedStatus);
      this.screen.render();
      this.statusRestoreTimer = null;
    }, 2000);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private stripTags(text: string): string {
    return text.replace(/\{[^}]*\}/g, '');
  }

  private handleSubmit(): void {
    const value = this.inputBuffer.trim();
    if (!value) return;

    this.logger?.info(`Prompt: ${value}`);
    this.logger?.debug(`Action: submit prompt (${value.length} chars)`);
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
    this.outputLines.push(text);
    this.plainLines.push(this.stripTags(text));
    this.outputLog.log(text);
    this.logger?.debug(`[UI] ${this.stripTags(text)}`);
    this.screen.render();
  }

  setLastAgentResponse(text: string): void {
    this.lastAgentResponse = text;
    this.logger?.debug(`Agent response tracked (${text.length} chars)`);
  }

  setSessions(sessions: SessionInfo[]): void {
    this.sessions = sessions;
    this.logger?.debug(`Sessions: updated list (${sessions.length} sessions)`);
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
    this.logger?.debug(`Input: ${enabled ? 'enabled' : 'disabled'}`);
    this.promptBox.setLabel(enabled ? ' > Prompt ' : ' ⏳ Running… ');
    if (enabled) this.renderPrompt();
    this.screen.render();
  }

  focusPrompt(): void {
    this.promptBox.focus();
    this.highlightActive('prompt');
    this.logger?.debug('Focus: prompt (via focusPrompt)');
    this.screen.render();
  }

  destroy(): void {
    if (this.statusRestoreTimer) {
      clearTimeout(this.statusRestoreTimer);
    }
    this.logger?.debug('Dashboard: destroyed');
    this.screen.destroy();
  }
}
