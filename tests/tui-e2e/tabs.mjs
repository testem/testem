import { quit, waitStartup, withDashboard } from './helper.mjs';

export const name = 'tabs';

export async function run() {
  await withDashboard({ launch: 'Alpha,Beta,Long' }, async (terminal) => {
    await waitStartup(terminal, 'Alpha');
    await terminal.getByText('Beta').expect();
    await terminal.getByText('Long').expect();
    await terminal.getByText('alpha-fixture').expect();

    await terminal.press('Right');
    await terminal.getByText('beta-fixture').expect();
    await terminal.getByText('alpha-fixture').expect({ not: true });

    await terminal.press('Right');
    await terminal.getByText('TUI_E2E_PAGE_TOP').expect();
    await terminal.getByText('alpha-fixture').expect({ not: true });
    await terminal.getByText('beta-fixture').expect({ not: true });

    await terminal.press('Right');
    await terminal.getByText('alpha-fixture').expect();
    await terminal.getByText('TUI_E2E_PAGE_TOP').expect({ not: true });

    await terminal.press('Left');
    await terminal.getByText('TUI_E2E_PAGE_TOP').expect();

    await terminal.press('Left');
    await terminal.getByText('beta-fixture').expect();

    await terminal.press('Left');
    await terminal.getByText('alpha-fixture').expect();

    await terminal.press('Tab');
    await terminal.getByText('alpha-fixture').expect();
    await terminal.getByText('p to pause').expect();

    await quit(terminal, 'q');
  });
}
