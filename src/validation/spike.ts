// src/validation/spike.ts
// THROWAWAY validation script — do not build abstractions here
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

async function main() {
  // CHECK 1: Bun can import playwright-extra with stealth plugin
  chromium.use(StealthPlugin());
  console.log('CHECK 1 PASS: Bun imports playwright-extra successfully');

  // CHECK 2: connectOverCDP attaches to Chrome on port 9222
  const res = await fetch('http://localhost:9222/json/version');
  const data = (await res.json()) as any;
  const wsUrl = data.webSocketDebuggerUrl;
  if (!wsUrl) throw new Error('No webSocketDebuggerUrl in /json/version response');
  const browser = await chromium.connectOverCDP(wsUrl);
  console.log('CHECK 2 PASS: CDP connection established');

  // CHECK 3: Find existing gemini.google.com tab
  let geminiPage: any = null;
  for (const ctx of browser.contexts()) {
    for (const pg of ctx.pages()) {
      if (pg.url().includes('gemini.google.com')) {
        geminiPage = pg;
        break;
      }
    }
    if (geminiPage) break;
  }
  if (!geminiPage) throw new Error('No Gemini tab found — open gemini.google.com in Chrome first');
  console.log('CHECK 3 PASS: Gemini tab found at', geminiPage.url());

  // CHECK 4: Inject text into Quill editor via execCommand (NOT page.type/page.fill)
  const editorSelectors = [
    '.ql-editor[contenteditable="true"]',
    'rich-textarea [contenteditable]',
    '[data-testid="chat-input"]',
  ];
  let editor: any = null;
  let usedSelector = '';
  for (const sel of editorSelectors) {
    editor = await geminiPage.$(sel);
    if (editor) {
      usedSelector = sel;
      break;
    }
  }
  if (!editor) throw new Error(`Quill editor not found with any selector: ${editorSelectors.join(', ')}`);
  await editor.click();
  await geminiPage.evaluate((el: any) => {
    el.focus();
    document.execCommand(
      'insertText',
      false,
      'Hello from cdp-agent validation spike. Please respond with "VALIDATION OK".',
    );
  }, editor);
  console.log('CHECK 4 PASS: Text injected into Quill editor (selector:', `${usedSelector})`);

  // Submit (press Enter)
  await geminiPage.keyboard.press('Enter');

  // CHECK 5 + CHECK 6: Extract response excluding thinking, detect streaming completion
  const startTime = Date.now();
  let lastText = '';
  let stableCount = 0;
  let responseText = '';

  while (true) {
    // Get all message-content elements NOT inside model-thoughts
    const text = await geminiPage.evaluate(() => {
      const allMessages = Array.from(document.querySelectorAll('message-content'));
      const filtered = allMessages.filter(
        (el: any) =>
          !el.closest('model-thoughts') && !el.closest('.thoughts-container') && !el.closest('.thoughts-content'),
      );
      return filtered[filtered.length - 1]?.textContent?.trim() ?? '';
    });

    if (text && text !== lastText) {
      lastText = text;
      stableCount = 0;
      responseText = text;
    } else if (text) {
      stableCount++;
    }

    // Dual-signal: content stable for 3 polls AND stop button gone
    const stopBtnSelectors = [
      '[aria-label="Stop generating"]',
      '[aria-label="Stop response"]',
      'button[aria-label*="Stop"]',
    ];
    let stopBtn = null;
    for (const sel of stopBtnSelectors) {
      stopBtn = await geminiPage.$(sel);
      if (stopBtn) break;
    }

    if (stableCount >= 3 && !stopBtn) break;
    if (Date.now() - startTime > 60000) throw new Error('Timeout (60s) waiting for response');
    await new Promise((r) => setTimeout(r, 500));
  }

  const elapsed = Date.now() - startTime;
  if (!responseText) throw new Error('No response extracted');
  console.log('CHECK 5 PASS: Response extracted (excludes thinking):', responseText.slice(0, 100));
  console.log('CHECK 6 PASS: Streaming completion detected after', elapsed, 'ms');

  await browser.close();
  console.log('\nAll 6 checks passed.');
}

main().catch((e) => {
  console.error('SPIKE FAILED:', e);
  process.exit(1);
});
