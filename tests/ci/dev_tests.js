'use strict';

var fs = require('fs');
var expect = require('chai').expect;
var path = require('path');
var sinon = require('sinon');

var App = require('../../lib/app');
var Config = require('../../lib/config');

var FakeReporter = require('../support/fake_reporter');

describe('dev mode app', function() {
  this.timeout(90000);

  beforeEach(function(done) {
    fs.unlink('tests/fixtures/tape/public/bundle.js', function() {
      done();
    });
  });

  describe('in interactive mode', function() {
    it('allows to restart a run', function(done) {
      var reporter = new FakeReporter();
      var dir = path.join('tests/fixtures/tape');
      var config = new Config('dev', {}, {
        file: path.join(dir, 'testem.json'),
        port: 0,
        cwd: dir,
        reporter: reporter,
        launch_in_ci: ['Node', 'NodePlain', 'PhantomJS']
      });
      config.read(function() {
        var app = new App(config, function(code, err) {
          expect(code).to.eq(1);
          expect(err.message).to.eq('Run killed.');
          done();
        });
        app.start();
        app.once('testRun', function() {
          process.nextTick(function() {
            app.triggerRun('restart');

            app.once('testRun', function() {
              app.exit(new Error('Run killed.'));
            });
          });
        });
      });
    });

    it('keeps runner association across page reloads', function(done) {
      var reporter = new FakeReporter();
      var dir = path.join('tests/fixtures/reload-test');
      var config = new Config('dev', {}, {
        file: path.join(dir, 'testem.json'),
        port: 0,
        cwd: dir,
        reporter: reporter,
        // For some reason the file watcher fires change events for
        // tests/fixtures/reload-test/testem.json which restarts our runner and
        // screws up our test, so we need to disable watching
        disable_watching: true,
        launch_in_dev: ['PhantomJS']
      });
      config.read(function() {
        var app = new App(config, function() {
          done();
        });
        var logins = 0;
        var onBrowserLogin = app.onBrowserLogin;
        sinon.stub(app, 'onBrowserLogin', function() {
          onBrowserLogin.apply(app, arguments);
          logins += 1;

          expect(app.runners.length).to.eq(1);

          if (logins === 2) {
            app.exit();
          }
        });
        app.start();
      });
    });
  });
});
