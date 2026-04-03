const EventEmitter = require('events').EventEmitter;
const sinon = require('sinon');
const expect = require('chai').expect;

const Process = require('../../lib/utils/process');

function createFakeChildProcess() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = function() {};
  child.then = function(onFulfilled) {
    return Promise.resolve({
      failed: false,
      exitCode: 0,
      shortMessage: '',
    }).then(onFulfilled);
  };
  return child;
}

describe('Process', function() {
  describe('kill', function() {
    let clock;

    beforeEach(function() {
      clock = sinon.useFakeTimers();
    });

    afterEach(function() {
      clock.restore();
    });

    it('resolves after exit when close never arrives', async function() {
      const child = createFakeChildProcess();
      const process = new Process('test', { killTimeout: 50 }, child);

      const killed = process.kill();
      let settled = false;

      killed.then(() => {
        settled = true;
      });

      await clock.tickAsync(1);
      child.emit('exit', 0);

      await clock.tickAsync(999);

      expect(settled).to.be.false();

      await clock.tickAsync(1);

      expect(await killed).to.equal(0);
      expect(process._killTimer).to.be.null();
    });
  });
});
