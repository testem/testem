

const expect = require('chai').expect;
const sinon = require('sinon');
const Testem = require('../public/testem/testem_client');

describe('Testem Client', function() {
  it('passes new socket to each custom adapter', function() {
    let socket1, socket2;

    Testem.useCustomAdapter(function(socket) {
      socket1 = socket;
    });

    Testem.useCustomAdapter(function(socket) {
      socket2 = socket;
    });

    expect(socket1).to.not.equal(socket2);
  });

  it('doesn\'t decycle build-in messages', function() {
    let decycleDepth = 10;

    global.decycle = sinon.spy();

    Testem._isIframeReady = true;

    Testem.useCustomAdapter(function(socket) {
      socket.iframe = {
        contentWindow: {
          postMessage: function() {}
        }
      };

      socket.decycleDepth = decycleDepth;
      socket.emitMessage('test');
    });

    sinon.assert.notCalled(global.decycle);
  });

  it('emits message with custom decycle depth to iframe for user messages', function() {
    let decycleDepth = 10;

    global.decycle = sinon.spy();

    Testem._isIframeReady = true;

    Testem.useCustomAdapter(function(socket) {
      socket.iframe = {
        contentWindow: {
          postMessage: function() {}
        }
      };

      socket.decycleDepth = decycleDepth;
      socket.emitMessage('browser-console', 'log', 'test');
    });

    sinon.assert.calledWithExactly(global.decycle, sinon.match.any, decycleDepth + 1);
  });

  it('drains message with custom decycle depth from queue', function() {
    let decycleDepth = 10;

    global.decycle = sinon.spy();

    Testem.emitMessageQueue = [];
    Testem._isIframeReady = false;

    Testem.useCustomAdapter(function(socket) {
      socket.iframe = {
        contentWindow: {
          postMessage: function() {}
        }
      };

      socket.decycleDepth = decycleDepth;
      socket.emitMessage('browser-console', 'log', 'test');
    });

    expect(Testem.emitMessageQueue).to.not.be.empty();

    Testem.drainMessageQueue();

    sinon.assert.calledWithExactly(global.decycle, sinon.match.any, decycleDepth + 1);
  });

  it('runs registered hooks after all tests finished', function(done) {
    let firstCalled = false;
    let secondCalled = false;
    Testem.afterTests(function(config, data, cb) {
      firstCalled = true;
      cb();
    });

    Testem.afterTests(function(config, data, cb) {
      secondCalled = true;
      cb();
    });

    Testem.on('after-tests-complete', function() {
      expect(firstCalled).to.be.true();
      expect(secondCalled).to.be.true();
      done();
    });
    Testem.runAfterTests();
  });

  describe('framework detection', function() {
    function createHookTester() {
      let testFrameworkDidInit = false;
      const jasmine2Adapter = sinon.spy();
      const mochaAdapter = sinon.spy();
      const qunitAdapter = sinon.spy();

      function hookIntoTestFramework(socket) {
        if (testFrameworkDidInit) {
          return true;
        }

        let found = true;
        if (typeof getJasmineRequireObj === 'function') {
          jasmine2Adapter(socket);
        } else if (typeof Mocha === 'function') {
          mochaAdapter(socket);
        } else if (typeof QUnit === 'object') {
          qunitAdapter(socket);
        } else {
          found = false;
        }

        testFrameworkDidInit = found;
        return found;
      }

      return {
        hookIntoTestFramework,
        jasmine2Adapter,
        mochaAdapter,
        qunitAdapter,
        reset() {
          testFrameworkDidInit = false;
        }
      };
    }

    it('uses jasmine2Adapter when getJasmineRequireObj is present', function() {
      const tester = createHookTester();
      global.getJasmineRequireObj = function() {};
      tester.hookIntoTestFramework({});
      expect(tester.jasmine2Adapter).to.have.been.calledOnce();
      delete global.getJasmineRequireObj;
    });

    it('does not hook legacy jasmine globals without getJasmineRequireObj', function() {
      const tester = createHookTester();
      global.jasmine = {};
      expect(tester.hookIntoTestFramework({})).to.equal(false);
      expect(tester.jasmine2Adapter).not.to.have.been.called();
      delete global.jasmine;
    });

    it('initializes the detected framework only once', function() {
      const tester = createHookTester();
      global.QUnit = {};
      expect(tester.hookIntoTestFramework({})).to.equal(true);
      expect(tester.hookIntoTestFramework({})).to.equal(true);
      expect(tester.qunitAdapter).to.have.been.calledOnce();
      delete global.QUnit;
    });
  });
});
