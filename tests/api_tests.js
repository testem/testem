'use strict';

var sinon = require('sinon');
var expect = require('chai').expect;
var Bluebird = require('bluebird');

var Api = require('../lib/api');
var App = require('../lib/app');
var Config = require('../lib/config');

var FakeReporter = require('./support/fake_reporter');

describe('Api', function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(Config.prototype, 'read');
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('new', function() {
    it('set defaults when using dev mode', function() {
      var api = new Api();
      api.startDev({parallel: 5, on_exit: 'test'});
      expect(api.config.read.callCount).to.equal(1);
      expect(api.config.get('on_exit')).to.equal('test');
      expect(api.config.get('parallel')).to.equal(-1);
      expect(api.config.get('reporter')).to.equal('dev');
    });

    it('set defaults when using CI mode', function() {
      var api = new Api();
      api.startCI({parallel: 5, on_exit: 'test'});
      expect(api.config.read.callCount).to.equal(1);
      expect(api.config.get('on_exit')).to.equal('test');
      expect(api.config.get('parallel')).to.equal(5);
      expect(api.config.get('disable_watching')).to.equal(true);
      expect(api.config.get('single_run')).to.equal(true);
    });
  });

  describe('restart', function() {
    // ensure pending timeouts are cancelled
    it('allows to restart the tests', function(done) {
      var api = new Api();
      api.startDev({ timeout: 20000 }, function() {});
      api.config.progOptions.reporter = new FakeReporter(); // TODO Find a better way
      api.app = new App(api.config, function() {
        done();
      });
      sandbox.spy(api.app, 'stopCurrentRun');
      sandbox.stub(api.app, 'singleRun', function() {
        return Bluebird.resolve().delay(100);
      });
      api.app.start(function() {
        setTimeout(function() {
          var calledCookie;

          var existingTimeout = api.app.timeoutID;

          expect(calledCookie).to.be.undefined();
          expect(existingTimeout).to.not.be.undefined();

          var originalTimeout = global.clearTimeout;
          sandbox.stub(global, 'clearTimeout', function(cookie) {
            calledCookie = cookie;
            originalTimeout(cookie);

            expect(calledCookie).to.not.be.undefined();
            expect(calledCookie).to.eql(existingTimeout);

            expect(api.app.stopCurrentRun.callCount).to.equal(2);
            api.app.exit();
          });

          api.restart();
        }, 50);
      });
    });
  });
});
