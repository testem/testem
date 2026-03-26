

var expect = require('chai').expect;

var RunTimeout = require('../../lib/utils/run-timeout');
var { using } = require('../../lib/utils/promises');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('RunTimeout', function() {
  describe('with', function() {
    it('can be used as a disposable which returns a timeout', function() {
      return using(RunTimeout.with(), function(timeout) {
        expect(timeout).to.be.an.instanceof(RunTimeout);
      });
    });

    it('allows to timeout a task', function() {
      return using(RunTimeout.with(0.1), function(timeout) {
        return timeout.try(function() {
          return Promise.resolve('within-timeout');
        }).then(function(result) {
          expect(result).to.eq('within-timeout');
        }).then(function() { return delay(100); }).then(function() {
          return timeout.try(function() {
            return Promise.resolve('within-timeout');
          });
        }).catch(function(err) {
          expect(err.message).to.eq('Run timed out.');
          return 'received';
        }).then(function(res) {
          expect(res).to.eq('received');
        });
      });
    });

    it('emits a timeout even on timeout', function() {
      var eventReceived = false;

      return using(RunTimeout.with(0.1), function(timeout) {
        timeout.on('timeout', function() {
          eventReceived = true;
        });

        return delay(100);
      }).then(function() {
        expect(eventReceived).to.equal(true);
      });
    });

    it('cleans started timers when disposed', function() {
      var timeout;

      return using(RunTimeout.with(1), function(_timeout) {
        timeout = _timeout;
        expect(timeout.timeoutID).to.exist();
      }).then(function() {
        expect(timeout.timeoutID).not.to.exist();
      });
    });
  });
});
