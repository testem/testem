import { quit, waitStartup, withDashboard } from './helper.mjs';

export const name = 'paging';

export async function run() {
  await withDashboard({ launch: 'Long', cols: 80, rows: 20 }, async (terminal) => {
    await waitStartup(terminal, 'Long');
    await terminal.getByText('TUI_E2E_PAGE_TOP').expect();

    // Half-page down, so a failure here means keys are not reaching Testem at
    // all rather than that the loops below scrolled too little.
    await terminal.type('d');
    await terminal.type('d');
    await terminal.getByText('TUI_E2E_PAGE_TOP').expect({ not: true });
    await terminal.type('u');
    await terminal.type('u');
    await terminal.getByText('TUI_E2E_PAGE_TOP').expect();

    // SPACE is the documented page-down key, but tui-test delivers neither
    // press('Space') nor type(' ') on GitHub's macos-26 PTY, so it is covered
    // by the key-map and AppView tests instead. Scrolling past either end is
    // clamped, so overshooting these loops is harmless.
    for (let i = 0; i < 30; i++) {
      await terminal.type('d');
    }
    await terminal.getByText('TUI_E2E_PAGE_BOTTOM').expect();

    for (let i = 0; i < 15; i++) {
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
