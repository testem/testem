import { quit, waitStartup, withDashboard } from './helper.mjs';

export const name = 'paging';

export async function run() {
  await withDashboard({ launch: 'Long', cols: 80, rows: 20 }, async (terminal) => {
    await waitStartup(terminal, 'Long');
    await terminal.getByText('TUI_E2E_PAGE_TOP').expect();

    for (let i = 0; i < 12; i++) {
      await terminal.press('Space');
    }
    await terminal.getByText('TUI_E2E_PAGE_BOTTOM').expect();

    for (let i = 0; i < 12; i++) {
      await terminal.type('b');
    }
    await terminal.getByText('TUI_E2E_PAGE_TOP').expect();

    await terminal.type('d');
    await terminal.type('d');
    await terminal.getByText('TUI_E2E_PAGE_TOP').expect({ not: true });
    await terminal.type('u');
    await terminal.type('u');
    await terminal.getByText('TUI_E2E_PAGE_TOP').expect();

    await terminal.press('Tab');
    await terminal.press('Down');
    await terminal.getByText('Long').expect();
    await terminal.getByText('p to pause').expect();

    await quit(terminal, 'q');
  });
}
