

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
    let jasmine2Adapter;
    let mochaAdapter;
    let qunitAdapter;

    beforeEach(function() {
      Testem.resetTestFrameworkDetection();
      jasmine2Adapter = sinon.spy();
      mochaAdapter = sinon.spy();
      qunitAdapter = sinon.spy();
      global.jasmine2Adapter = jasmine2Adapter;
      global.mochaAdapter = mochaAdapter;
      global.qunitAdapter = qunitAdapter;
    });

    afterEach(function() {
      Testem.resetTestFrameworkDetection();
      delete global.jasmine2Adapter;
      delete global.mochaAdapter;
      delete global.qunitAdapter;
      delete global.jasmine;
      delete global.QUnit;
      delete global.Mocha;
    });

    it('uses jasmine2Adapter when jasmine.getEnv is a function', function() {
      global.jasmine = { getEnv: function() {} };
      expect(Testem.detectTestFramework({})).to.equal(true);
      expect(jasmine2Adapter).to.have.been.calledOnce();
    });

    it('does not hook a bare jasmine object without getEnv', function() {
      global.jasmine = {};
      expect(Testem.detectTestFramework({})).to.equal(false);
      expect(jasmine2Adapter).not.to.have.been.called();
    });

    it('initializes the detected framework only once', function() {
      global.QUnit = {};
      expect(Testem.detectTestFramework({})).to.equal(true);
      expect(Testem.detectTestFramework({})).to.equal(true);
      expect(qunitAdapter).to.have.been.calledOnce();
    });
  });
});
