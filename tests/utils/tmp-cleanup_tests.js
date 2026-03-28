

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execaNode } = require('execa');
const expect = require('chai').expect;
const isWin = require('../../lib/utils/is-win')();

const { registerCleanup, _registeredDirs } = require('../../lib/utils/tmp-cleanup');

describe('tmp-cleanup', function() {
  describe('registerCleanup', function() {
    let dir;

    afterEach(function() {
      if (dir) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it('does not remove the directory immediately', function() {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testem-cleanup-test-'));
      registerCleanup(dir);
      expect(fs.existsSync(dir)).to.be.true();
    });

    it('is idempotent when called multiple times with the same path', function() {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testem-cleanup-test-'));
      registerCleanup(dir);
      const sizeAfterFirst = _registeredDirs.size;
      registerCleanup(dir);
      // registering same path twice must not add a second entry to the set
      expect(_registeredDirs.size).to.equal(sizeAfterFirst);
    });

    it('removes the directory when the process exits', async function() {
      const helperPath = path.join(
        __dirname,
        '../support/tmp_cleanup_helper.js'
      );
      const { stdout } = await execaNode(helperPath);
      dir = stdout.trim(); // afterEach uses this; force:true means no-op if already gone
      expect(fs.existsSync(dir)).to.be.false();
    });

    it('removes the directory when the process receives SIGTERM', async function() {
      if (isWin) { return this.skip(); }
      const helperPath = path.join(__dirname, '../support/tmp_cleanup_signal_helper.js');
      const subprocess = execaNode(helperPath);
      dir = await new Promise(resolve => {
        subprocess.stdout.once('data', chunk => resolve(chunk.toString().trim()));
      });
      subprocess.kill('SIGTERM');
      await subprocess.catch(() => {});
      expect(fs.existsSync(dir)).to.be.false();
    });

    it('removes the directory when the process receives SIGINT', async function() {
      if (isWin) { return this.skip(); }
      const helperPath = path.join(__dirname, '../support/tmp_cleanup_signal_helper.js');
      const subprocess = execaNode(helperPath);
      dir = await new Promise(resolve => {
        subprocess.stdout.once('data', chunk => resolve(chunk.toString().trim()));
      });
      subprocess.kill('SIGINT');
      await subprocess.catch(() => {});
      expect(fs.existsSync(dir)).to.be.false();
    });
  });
});
