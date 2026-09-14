import { quit, waitStartup, withDashboard } from './helper.mjs';

export const name = 'unbound';

export async function run() {
  await withDashboard({ launch: 'Alpha,Beta' }, async (terminal) => {
    await waitStartup(terminal, 'Alpha');
    await terminal.getByText('alpha-fixture').expect();

    await terminal.type('P');
    await terminal.type('B');
    await terminal.type('U');
    await terminal.type('D');
    await terminal.type('x');
    await terminal.getByText('PAUSED').expect({ not: true });
    await terminal.getByText('alpha-fixture').expect();

    await terminal.press('Shift+Tab');
    await terminal.press('Escape');
    await terminal.getByText('p to pause').expect();
    await terminal.getByText('alpha-fixture').expect();

    await quit(terminal, 'q');
  });
}
