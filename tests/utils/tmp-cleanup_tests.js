

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execaNode } = require('execa');
const expect = require('chai').expect;

const { registerCleanup } = require('../../lib/utils/tmp-cleanup');

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
      const exitCountAfterFirst = process.listenerCount('exit');
      registerCleanup(dir);
      // registering twice must not add a second process.on('exit') handler
      expect(process.listenerCount('exit')).to.equal(exitCountAfterFirst);
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
  });
});
