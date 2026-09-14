import { pageDown, quit, waitStartup, withDashboard } from './helper.mjs';

export const name = 'paging';

export async function run() {
  await withDashboard({ launch: 'Long', cols: 80, rows: 20 }, async (terminal) => {
    await waitStartup(terminal, 'Long');
    await terminal.getByText('TUI_E2E_PAGE_TOP').expect();
    // PAGE_TOP appears on the first TAP line; Long still has 39 more.
    // Wait until the run is done so later relayouts cannot cover the arrows.
    await terminal.getByText('0/40').expect();
    await terminal.waitIdle();

    // Named arrows work on the macOS CI PTY. Each TAP fail is a few lines.
    for (let i = 0; i < 8; i++) {
      await terminal.press('Down');
    }
    await terminal.getByText('TUI_E2E_PAGE_TOP').expect({ not: true });
    for (let i = 0; i < 8; i++) {
      await terminal.press('Up');
    }
    await terminal.getByText('TUI_E2E_PAGE_TOP').expect();

    await terminal.type('d');
    await terminal.type('d');
    await terminal.getByText('TUI_E2E_PAGE_TOP').expect({ not: true });
    await terminal.type('u');
    await terminal.type('u');
    await terminal.getByText('TUI_E2E_PAGE_TOP').expect();

    // Raw 0x20 — not press('Space') / type(' '). Scrolling past either end
    // is clamped, so overshooting these loops is harmless.
    for (let i = 0; i < 12; i++) {
      await pageDown(terminal);
    }
    await terminal.getByText('TUI_E2E_PAGE_BOTTOM').expect();

    for (let i = 0; i < 12; i++) {
      await terminal.type('b');
    }
    await terminal.getByText('TUI_E2E_PAGE_TOP').expect();

    await terminal.press('Tab');
    await terminal.press('Down');
    await terminal.getByText('Long').expect();
    await terminal.getByText('p to pause').expect();

    await quit(terminal, 'q');
  });
}
