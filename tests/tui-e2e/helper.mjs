import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TuiTest } from '@microsoft/tui-test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const testemJs = path.join(root, 'testem.js');
const configFile = path.join(root, 'testem.tui-e2e.js');
const artifactDir = path.join(root, 'artifacts', 'tui-e2e');

export async function startDashboard({
  launch,
  cols = 120,
  rows = 40
} = {}) {
  const terminal = TuiTest.ephemeral('testem-tui', {
    timeouts: {
      text: 20000,
      idle: 10000,
      exit: 15000
    },
    artifacts: {
      dir: artifactDir,
      onFailure: 'text'
    },
    recording: {
      mode: 'on-failure',
      directory: artifactDir
    }
  });

  await terminal.run(process.execPath, [
    testemJs,
    '-f',
    configFile,
    '--launch',
    launch
  ], {
    cwd: root,
    cols: cols,
    rows: rows,
    waitReady: false,
    env: {
      TERM: 'xterm-256color'
    }
  });

  return terminal;
}

export async function dumpFailure(terminal, err) {
  try {
    const screen = await terminal.text();
    console.error('--- tui-e2e screen ---');
    console.error(screen);
    console.error('--- end screen ---');
  } catch (dumpErr) {
    console.error('Could not read screen:', dumpErr.message || dumpErr);
  }
  console.error(err);
}

// tui-test type(' ') and press('Space') never deliver 0x20 on GitHub's
// macos-26 PTY. write() sends the raw byte; terminal-kit then emits ' '.
export async function pageDown(terminal) {
  await terminal.write(' ');
}

export async function quit(terminal, key) {
  if (key === 'Ctrl+C') {
    await terminal.press('Ctrl+C');
  } else {
    await terminal.type(key);
  }
  try {
    await terminal.waitExit({ timeout: 15000 });
  } catch (err) {
    await terminal.kill();
    throw err;
  }
}

export async function withDashboard(opts, fn) {
  const terminal = await startDashboard(opts);
  try {
    await fn(terminal);
  } catch (err) {
    await dumpFailure(terminal, err);
    try {
      await terminal.kill();
    } catch {
      // already gone
    }
    await terminal.closeQuiet();
    throw err;
  }
  await terminal.closeQuiet();
}

export async function waitStartup(terminal, tabName) {
  await terminal.getByText("TEST'EM").expect();
  await terminal.getByText('7401').expect();
  if (tabName) {
    await terminal.getByText(tabName).expect();
  }
  await terminal.getByText('Press ENTER to run tests; q to quit').expect();
  await terminal.getByText('p to pause').expect();
  await terminal.getByText('PAUSED').expect({ not: true });
}
