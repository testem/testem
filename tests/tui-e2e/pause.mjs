import { quit, waitStartup, withDashboard } from './helper.mjs';

export const name = 'pause';

export async function run() {
  await withDashboard({ launch: 'Alpha' }, async (terminal) => {
    await waitStartup(terminal, 'Alpha');
    await terminal.type('p');
    await terminal.getByText('p to unpause').expect();
    await terminal.getByText('PAUSED').expect();

    // ENTER is run, not unpause. Pause only blocks file-watch reruns.
    await terminal.press('Enter');
    await terminal.getByText('PAUSED').expect();
    await terminal.getByText('p to unpause').expect();

    await terminal.type('p');
    await terminal.getByText('p to pause').expect();
    await terminal.getByText('PAUSED').expect({ not: true });
    await quit(terminal, 'q');
  });
}
