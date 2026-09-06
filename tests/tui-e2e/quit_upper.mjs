import { quit, waitStartup, withDashboard } from './helper.mjs';

export const name = 'quit_upper';

export async function run() {
  await withDashboard({ launch: 'Alpha' }, async (terminal) => {
    await waitStartup(terminal, 'Alpha');
    await quit(terminal, 'Q');
  });
}
