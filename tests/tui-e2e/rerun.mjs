import { quit, waitStartup, withDashboard } from './helper.mjs';

export const name = 'rerun';

export async function run() {
  await withDashboard({ launch: 'Alpha' }, async (terminal) => {
    await waitStartup(terminal, 'Alpha');
    await terminal.getByText('alpha-fixture').expect();
    await terminal.press('Enter');
    await terminal.getByText('alpha-fixture').expect();
    await terminal.getByText('p to pause').expect();
    await quit(terminal, 'q');
  });
}
