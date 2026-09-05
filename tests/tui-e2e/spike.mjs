import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TuiTest } from '@microsoft/tui-test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const testemJs = path.join(root, 'testem.js');
const configFile = path.join(root, 'testem.tui-e2e.js');
const artifactDir = path.join(root, 'artifacts', 'tui-e2e');

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

async function dumpFailure(err) {
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

async function main() {
  await terminal.run(process.execPath, [
    testemJs,
    '-f',
    configFile,
    '--launch',
    'Fixture'
  ], {
    cwd: root,
    cols: 120,
    rows: 40,
    waitReady: false,
    env: {
      TERM: 'xterm-256color'
    }
  });

  await terminal.getByText("TEST'EM").expect();
  await terminal.getByText('p to pause').expect();

  await terminal.type('p');
  await terminal.getByText('PAUSED').expect();

  await terminal.type('p');
  await terminal.getByText('p to pause').expect();

  await terminal.type('q');
  await terminal.waitExit();
}

main().then(async () => {
  await terminal.closeQuiet();
  console.log('tui-e2e spike: start, pause, unpause, quit');
}).catch(async (err) => {
  await dumpFailure(err);
  await terminal.closeQuiet();
  process.exitCode = 1;
});
