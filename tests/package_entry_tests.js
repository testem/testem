import { expect } from 'chai';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import Api from 'testem';

const require = createRequire(import.meta.url);

describe('package entry', function() {
  it('import and require return the same Api class', function() {
    const RequiredApi = require('testem');
    expect(Api).to.equal(RequiredApi);
    expect(new Api()).to.be.instanceOf(RequiredApi);
    expect(new RequiredApi()).to.be.instanceOf(Api);
  });

  it('a spawned CommonJS file can require testem', function() {
    const script = fileURLToPath(new URL('./support/require-testem.cjs', import.meta.url));
    const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
    expect(result.status, result.stderr).to.equal(0);
    expect(result.stdout.trim()).to.equal('Api');
  });

  it('a spawned ESM file can import testem', function() {
    const script = fileURLToPath(new URL('./support/import-testem.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
    expect(result.status, result.stderr).to.equal(0);
    expect(result.stdout.trim()).to.equal('Api');
  });

  it('does not export deep package paths', function() {
    let err;
    try {
      require('testem/lib/config.js');
    } catch (e) {
      err = e;
    }
    expect(err).to.be.instanceOf(Error);
    expect(err.code).to.equal('ERR_PACKAGE_PATH_NOT_EXPORTED');
  });
});
