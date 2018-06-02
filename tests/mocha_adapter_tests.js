'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const mochaAdapter = require('../public/testem/mocha_adapter');

function Runner() {}
Runner.prototype.emit = function() {};

function MochaRunner() {}
MochaRunner.prototype.emit = function() {};

function replaceGlobals(newGlobals, originalGlobals) {
  for (let key in newGlobals) {
    originalGlobals[key] = global[key];
    global[key] = newGlobals[key];
  }
}

function restoreGlobals(originalGlobals) {
  for (let key in originalGlobals) {
    global[key] = originalGlobals[key];
  }
}

describe('mochaAdapter', function() {
  let sandbox, originalEmit, globals, _mocha, _Mocha, _emit, _setTimeout;

  beforeEach(function() {
    globals = {};
    sandbox = sinon.sandbox.create();
    _emit = sandbox.stub();
    _setTimeout = sandbox.stub();
    _mocha = {Runner: Runner};
    _Mocha = {Runner: MochaRunner};
    originalEmit = sandbox.stub(Runner.prototype, 'emit');

    replaceGlobals({
      mocha: _mocha,
      Mocha: _Mocha,
      setTimeout: _setTimeout,
      emit: _emit
    }, globals);
  });

  afterEach(function() {
    sandbox.restore();
    restoreGlobals(globals);
  });

  describe('when mocha.Runner is defined', function() {
    beforeEach(function() {
      mochaAdapter();
    });

    it('should override Runner.prototype.emit', function() {
      expect(Runner.prototype.emit).not.to.equal(originalEmit);
    });
  });

  describe('when mocha.Runner is not defined, but Mocha.Runner is defined', function() {
    beforeEach(function() {
      originalEmit = sandbox.stub(MochaRunner.prototype, 'emit');
      delete _mocha.Runner;
      mochaAdapter();
    });

    it('should override Runner.prototype.emit', function() {
      expect(MochaRunner.prototype.emit).not.to.equal(originalEmit);
    });
  });

  describe('when the Runner instance is used', function() {
    let runner, evt, test, err;
    beforeEach(function() {
      mochaAdapter();
      runner = new Runner();
      evt = '';
      test = {};
      err = null;
    });

    describe('when a "start" event is emitted', function() {
      beforeEach(function() {
        evt = 'start';
        runner.emit(evt, test, err);
      });

      it('should call the original emit with the same args', function() {
        expect(originalEmit).to.have.been.calledWith(evt, test, err);
      });

      it('should emit a "tests-start" event', function() {
        expect(_emit).to.have.been.calledWith('tests-start');
      });
    });

    describe('when a "end" event is emitted', function() {
      beforeEach(function() {
        evt = 'end';
        runner.emit(evt, test, err);
      });

      it('should call the original emit with the same args', function() {
        expect(originalEmit).to.have.been.calledWith(evt, test, err);
      });

      it('should emit an "all-test-results" event', function() {
        expect(_emit).to.have.been.calledWith('all-test-results');
      });
    });

    let tests = {
      failed: {
        duration: 123,
        state: 'failed',
        title: 'foo'
      },
      passed: {
        duration: 456,
        parent: {
          title: 'foo'
        },
        state: 'passed',
        title: 'bar'
      },
      pending: {
        parent: {
          title: 'bar',
          parent: {
            title: 'foo'
          }
        },
        pending: true,
        state: '',
        title: 'baz'
      }
    };

    describe('when a "test end" event is emitted with a passed test', function() {
      beforeEach(function() {
        evt = 'test end';
        test = tests.passed;
        runner.emit(evt, test, err);
      });

      it('should call the original emit with the same args', function() {
        expect(originalEmit).to.have.been.calledWith(evt, test, err);
      });

      it('should schedule something to run later', function() {
        expect(_setTimeout).to.have.been.calledWith(sinon.match.func, 0);
      });

      it('should not emit any event yet', function() {
        expect(_emit).to.have.callCount(0);
      });

      describe('after scheduled code runs', function() {
        beforeEach(function() {
          let fn = _setTimeout.lastCall.args[0];
          fn();
        });

        it('should emit a "test-result" event', function() {
          expect(_emit).to.have.been.calledWith('test-result', {
            failed: 0,
            id: 1,
            items: [],
            name: 'foo bar ',
            passed: 1,
            pending: 0,
            runDuration: 456,
            total: 1
          });
        });

        it('should not emit an "all-test-results" event', function() {
          expect(_emit).not.to.have.been.calledWith('all-test-results');
        });
      });
    });

    describe('when a "test end" event is emitted with a failed test', function() {
      beforeEach(function() {
        evt = 'test end';
        test = tests.failed;
        err = {message: 'The error message', stack: 'The stack trace'};
        runner.emit(evt, test, err);
      });

      it('should call the original emit with the same args', function() {
        expect(originalEmit).to.have.been.calledWith(evt, test, err);
      });

      it('should schedule something to run later', function() {
        expect(_setTimeout).to.have.been.calledWith(sinon.match.func, 0);
      });

      it('should not emit any event yet', function() {
        expect(_emit).to.have.callCount(0);
      });

      describe('after scheduled code runs', function() {
        beforeEach(function() {
          let fn = _setTimeout.lastCall.args[0];
          fn();
        });

        it('should not emit a "test-result" event', function() {
          expect(_emit).not.to.have.been.called();
        });

        it('should not emit an "all-test-results" event', function() {
          expect(_emit).not.to.have.been.calledWith('all-test-results');
        });
      });
    });

    describe('when a "test end" event is emitted with a pending test', function() {
      beforeEach(function() {
        evt = 'test end';
        test = tests.pending;
        runner.emit(evt, test, err);
      });

      it('should call the original emit with the same args', function() {
        expect(originalEmit).to.have.been.calledWith(evt, test, err);
      });

      it('should schedule something to run later', function() {
        expect(_setTimeout).to.have.been.calledWith(sinon.match.func, 0);
      });

      it('should not emit any event yet', function() {
        expect(_emit).to.have.callCount(0);
      });

      describe('after scheduled code runs', function() {
        beforeEach(function() {
          let fn = _setTimeout.lastCall.args[0];
          fn();
        });

        it('should emit a "test-result" event', function() {
          expect(_emit).to.have.been.calledWith('test-result', {
            failed: 0,
            id: 1,
            items: [],
            name: 'foo bar baz ',
            passed: 0,
            pending: 1,
            total: 1
          });
        });

        it('should not emit an "all-test-results" event', function() {
          expect(_emit).not.to.have.been.calledWith('all-test-results');
        });
      });
    });

    describe('when a "test end" event is emitted', function() {
      beforeEach(function() {
        evt = 'test end';
        test = tests.passed;
        runner.emit(evt, test, err);
      });

      describe('and then an "end" event is emitted before the "test end" is processed', function() {
        beforeEach(function() {
          runner.emit('end', {}, null);
        });

        it('should not emit "all-test-results" yet', function() {
          expect(_emit).not.to.have.been.calledWith('all-test-results');
        });

        describe('after scheduled code runs', function() {
          beforeEach(function() {
            let fn = _setTimeout.lastCall.args[0];
            fn();
          });

          it('should emit an "all-test-results" event', function() {
            expect(_emit).to.have.been.calledWith('all-test-results');
          });
        });
      });
    });

    describe('when multiple "test end" events are emitted and processed', function() {
      let fn;
      beforeEach(function() {
        evt = 'test end';

        runner.emit(evt, tests.passed, err);
        fn = _setTimeout.lastCall.args[0];
        fn();

        // Note: Have to run it with "fail" event because "test end" on failure doesn't do anything
        // by itself.
        runner.emit('fail', tests.failed, {message: 'msg', stack: 'trace'});

        runner.emit(evt, tests.pending, err);
        fn = _setTimeout.lastCall.args[0];
        fn();
      });

      describe('then an "end" event is emitted', function() {
        beforeEach(function() {
          runner.emit('end', {}, null);
        });

        it('should emit an "all-test-results" event', function() {
          expect(_emit).to.have.been.calledWith('all-test-results');
        });
      });
    });

    describe('when a "fail" event is emitted', function() {
      beforeEach(function() {
        evt = 'fail';
        test = tests.failed;
        err = {message: 'The error message', stack: 'The stack trace'};
        runner.emit(evt, test, err);
      });

      it('should call the original emit with the same args', function() {
        expect(originalEmit).to.have.been.calledWith(evt, test, err);
      });

      it('should emit a "test-result" event', function() {
        expect(_emit).to.have.been.calledWith('test-result', {
          failed: 1,
          id: 1,
          items: [{
            passed: false,
            message: 'The error message',
            stack: 'The stack trace'
          }],
          name: 'foo ',
          passed: 0,
          pending: 0,
          runDuration: 123,
          total: 1
        });
      });

      describe('and then a "test end" event is emitted', function() {
        beforeEach(function() {
          evt = 'test end';
          test = tests.failed;
          err = {message: 'The error message', stack: 'The stack trace'};
          runner.emit(evt, test, err);
        });

        it('should have emitted a "test-result" event just once', function() {
          expect(_emit).to.have.been.calledOnce();
        });
      });
    });
  });
});
