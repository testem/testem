import { waitStartup, withDashboard } from './helper.mjs';

export const name = 'quit_twice';

export async function run() {
  await withDashboard({ launch: 'Hang' }, async (terminal) => {
    await waitStartup(terminal, 'Hang');
    await terminal.type('q');
    await new Promise((resolve) => setTimeout(resolve, 600));
    try {
      await terminal.type('q');
    } catch {
      // first q already closed the PTY
    }
    try {
      await terminal.waitExit({ timeout: 15000 });
    } catch (err) {
      await terminal.kill();
      throw err;
    }
  });
}
