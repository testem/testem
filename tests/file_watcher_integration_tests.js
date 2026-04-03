/**
 * Integration tests for `lib/file_watcher` (FileWatcher): real temp dirs and
 * `process.chdir`, no stubbed watch engine.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const expect = require('chai').expect;

const FileWatcher = require('../lib/file_watcher');

function makeConfig(overrides) {
  const state = {
    file: undefined,
    watch_files: undefined,
    src_files: undefined,
    src_files_ignore: undefined,
    cwdMode: false,
    ...overrides,
  };
  return {
    get(key) {
      return state[key];
    },
    isCwdMode() {
      return !!state.cwdMode;
    },
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolves with the first argument passed to `event`, or rejects after `timeoutMs`.
 */
function onceEvent(emitter, event, timeoutMs) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      emitter.removeListener(event, listener);
      reject(
        new Error('Timed out after ' + timeoutMs + 'ms waiting for ' + event),
      );
    }, timeoutMs);
    function listener(arg) {
      clearTimeout(t);
      resolve(arg);
    }
    emitter.once(event, listener);
  });
}

describe('FileWatcher integration', function() {
  this.timeout(15000);

  let prevCwd;
  let tmpDir;

  beforeEach(function() {
    prevCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testem-fw-int-'));
  });

  afterEach(function() {
    try {
      process.chdir(prevCwd);
    } catch {
      // ignore
    }
    if (tmpDir) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
      tmpDir = null;
    }
  });

  it('emits fileChanged when a new file matching src_files is created', async function() {
    process.chdir(tmpDir);
    const fw = new FileWatcher(makeConfig({ src_files: ['*.js'] }));

    await delay(600);

    const next = onceEvent(fw, 'fileChanged', 8000);
    fs.writeFileSync(path.join(tmpDir, 'new.js'), '// created');

    const filepath = await next;
    expect(path.basename(filepath)).to.equal('new.js');
  });

  it('emits fileChanged when an existing matching file is modified', async function() {
    fs.writeFileSync(path.join(tmpDir, 'existing.js'), 'v1');
    process.chdir(tmpDir);

    const fw = new FileWatcher(makeConfig({ src_files: ['*.js'] }));

    await delay(600);

    const next = onceEvent(fw, 'fileChanged', 8000);
    fs.writeFileSync(path.join(tmpDir, 'existing.js'), 'v2');

    const filepath = await next;
    expect(path.basename(filepath)).to.equal('existing.js');
  });

  it('does not emit fileChanged for paths matching src_files_ignore', async function() {
    fs.mkdirSync(path.join(tmpDir, 'vendor'), { recursive: true });
    process.chdir(tmpDir);

    const fw = new FileWatcher(
      makeConfig({
        src_files: ['**/*.js'],
        src_files_ignore: ['vendor/**'],
      }),
    );

    await delay(600);

    let received = null;
    fw.on('fileChanged', (p) => {
      received = p;
    });

    fs.writeFileSync(path.join(tmpDir, 'vendor', 'ignored.js'), '// ignored');

    await delay(2000);

    expect(received).to.equal(null);
  });

  it('add forwards a path so later changes to that file are observed', async function() {
    fs.mkdirSync(path.join(tmpDir, 'lib'), { recursive: true });
    process.chdir(tmpDir);

    const fw = new FileWatcher(makeConfig({ src_files: ['root.js'] }));

    await delay(400);

    // Same shape as App#onFileRequested: path relative to cwd
    fw.add('lib/extra.js');

    await delay(600);

    const next = onceEvent(fw, 'fileChanged', 8000);
    fs.writeFileSync(path.join(tmpDir, 'lib', 'extra.js'), 'export {}');

    const filepath = await next;
    expect(path.basename(filepath)).to.equal('extra.js');
  });
});
