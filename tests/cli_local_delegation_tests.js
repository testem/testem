const { expect } = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  findLocalTestemScript,
  resolveLocalTestemCliOrNull,
} = require('../lib/cli-local-delegation');

describe('CLI local delegation', function() {
  let tmp;

  beforeEach(function() {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'testem-deleg-'));
  });

  afterEach(function() {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('findLocalTestemScript returns null when no node_modules/testem', function() {
    expect(findLocalTestemScript(tmp)).to.equal(null);
  });

  it('findLocalTestemScript finds testem in cwd', function() {
    const dir = path.join(tmp, 'node_modules', 'testem');
    fs.mkdirSync(dir, { recursive: true });
    const script = path.join(dir, 'testem.js');
    fs.writeFileSync(script, '');
    expect(findLocalTestemScript(tmp)).to.equal(script);
  });

  it('findLocalTestemScript walks up to parent', function() {
    const proj = path.join(tmp, 'project', 'nested');
    fs.mkdirSync(proj, { recursive: true });
    const dir = path.join(tmp, 'project', 'node_modules', 'testem');
    fs.mkdirSync(dir, { recursive: true });
    const script = path.join(dir, 'testem.js');
    fs.writeFileSync(script, '');
    expect(findLocalTestemScript(proj)).to.equal(script);
  });

  it('resolveLocalTestemCliOrNull returns null when TESTEM_USE_GLOBAL=1', function() {
    const cur = path.join(tmp, 'global', 'testem.js');
    fs.mkdirSync(path.dirname(cur), { recursive: true });
    fs.writeFileSync(cur, '');

    const proj = path.join(tmp, 'project');
    const local = path.join(proj, 'node_modules', 'testem', 'testem.js');
    fs.mkdirSync(path.dirname(local), { recursive: true });
    fs.writeFileSync(local, '');

    expect(
      resolveLocalTestemCliOrNull(cur, proj, {
        ...process.env,
        TESTEM_USE_GLOBAL: '1',
      }),
    ).to.equal(null);
  });

  it('resolveLocalTestemCliOrNull returns null when local is the same file', function() {
    const base = path.join(tmp, 'proj');
    const script = path.join(base, 'node_modules', 'testem', 'testem.js');
    fs.mkdirSync(path.dirname(script), { recursive: true });
    fs.writeFileSync(script, 'x');
    expect(resolveLocalTestemCliOrNull(script, base, {})).to.equal(null);
  });

  it('resolveLocalTestemCliOrNull returns local path when global and local differ', function() {
    const glob = path.join(tmp, 'global', 'testem.js');
    fs.mkdirSync(path.dirname(glob), { recursive: true });
    fs.writeFileSync(glob, 'global');

    const proj = path.join(tmp, 'proj');
    const local = path.join(proj, 'node_modules', 'testem', 'testem.js');
    fs.mkdirSync(path.dirname(local), { recursive: true });
    fs.writeFileSync(local, 'local');

    expect(resolveLocalTestemCliOrNull(glob, proj, {})).to.equal(local);
  });
});
