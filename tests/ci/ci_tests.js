'use strict';

var fs = require('fs');
var App = require('../../lib/app');
var TestReporter = require('../../lib/reporters/tap_reporter');
var Config = require('../../lib/config');
var sinon = require('sinon');
var assert = require('chai').assert;
var expect = require('chai').expect;
var path = require('path');
var http = require('http');
var childProcess = require('child_process');
var Bluebird = require('bluebird');

var FakeReporter = require('../support/fake_reporter');

var isWin = /^win/.test(process.platform);

describe('ci mode app', function() {
  this.timeout(90000);
  var sandbox;

  beforeEach(function(done) {
    sandbox = sinon.sandbox.create();
    fs.unlink('tests/fixtures/tape/public/bundle.js', function() {
      done();
    });
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('multiple launchers', function() {
    beforeEach(function(done) {
      fs.unlink('tests/fixtures/tape/public/bundle.js', function() {
        done();
      });
    });

    it('runs them tests on node, nodetap, and browser', function(done) {
      var reporter = new TestReporter(true);
      var dir = path.join('tests/fixtures/tape');
      var config = new Config('ci', {
        file: path.join(dir, 'testem.json'),
        port: 0,
        cwd: dir,
        reporter: reporter,
        launch_in_ci: ['node', 'nodeplain', 'phantomjs']
      });
      config.read(function() {
        var app = new App(config, function(code) {
          expect(code).to.eq(1);

          var helloWorld = reporter.results.filter(function(r) {
            return r.result.name.match(/hello world/);
          });
          var helloBob = reporter.results.filter(function(r) {
            return r.result.name.match(/hello bob/);
          });
          var nodePlain = reporter.results.filter(function(r) {
            return r.launcher === 'NodePlain';
          });
          assert(helloWorld.every(function(r) {
            return r.result.passed;
          }), 'hello world should pass');

          assert(helloBob.every(function(r) {
            return !r.result.passed;
          }), 'hello bob should fail');

          expect(nodePlain[0]).to.exist();
          assert(!nodePlain[0].result.passed, 'node plain should fail');

          var launchers = reporter.results.map(function(r) {
            return r.launcher;
          });

          assert.include(launchers, 'Node');
          assert.include(launchers, 'NodePlain');
          assert(launchers.some(function(n) { return n.match(/^PhantomJS \d/); }), 'Launchers should include some version of PhantomJS');

          var globalLauncher = reporter.results.filter(function(r) {
            return r.launcher === null;
          });
          expect(globalLauncher).to.be.empty();

          expect(reporter.results.length).to.eq(5);
          done();
        });
        app.start();
      });
    });

    it('returns successfully with passed and skipped tests', function(done) {
      var dir = path.join('tests/fixtures/success-skipped');
      var config = new Config('ci', {
        file: path.join(dir, 'testem.json'),
        port: 0,
        cwd: dir,
        launch_in_ci: ['phantomjs'],
        reporter: new TestReporter(true)
      });
      config.read(function() {
        var app = new App(config, function(exitCode) {
          expect(exitCode).to.eq(0);
          done();
        });
        app.start();
      });
    });

    it('returns with non zero exit code when detected a global error', function(done) {
      var dir = path.join('tests/fixtures/global-error');
      var config = new Config('ci', {
        file: path.join(dir, 'testem.json'),
        port: 0,
        cwd: dir,
        launch_in_ci: ['phantomjs'],
        reporter: new TestReporter(true)
      });
      config.read(function() {
        var app = new App(config, function(exitCode) {
          expect(exitCode).to.eq(1);
          done();
        });
        app.start();
      });
    });

    it('returns with non zero exit code when browser exits', function(done) {
      var dir = path.join('tests/fixtures/slow-pass');
      var app;
      var config = new Config('ci', {
        file: path.join(dir, 'testem.json'),
        port: 0,
        cwd: dir,
        launch_in_ci: ['phantomjs'],
        reporter: new TestReporter(true),
        on_start: function(config, data, callback) {
          var launcher = app.launchers()[0];

          launcher.on('processStarted', function(process) {
            setTimeout(function() {
              if (isWin) {
                childProcess.exec('taskkill /pid ' + process.pid + ' /T');
              } else {
                process.kill();
              }
            }, 10000); // TODO Starting PhantomJS on Windows is really slow / find a better way
          });

          callback();
        }
      });
      config.read(function() {
        app = new App(config, function(exitCode) {
          expect(exitCode).to.eq(1);
          done();
        });
        app.start();
      });
    });

    it('returns with non zero exit code when browser disconnects', function(done) {
      var dir = path.join('tests/fixtures/disconnect-test');
      var config = new Config('ci', {
        file: path.join(dir, 'testem.json'),
        port: 0,
        cwd: dir,
        launch_in_ci: ['phantomjs'],
        reporter: new TestReporter(true),
        browser_disconnect_timeout: 0.1
      });
      config.read(function() {
        var app = new App(config, function(exitCode) {
          expect(exitCode).to.eq(1);
          done();
        });
        app.start();
      });
    });

    it('forwards console messages to the reporter', function(done) {
      var reporter = new TestReporter(true);
      var dir = path.join('tests/fixtures/console-test');
      var config = new Config('ci', {
        file: path.join(dir, 'testem.json'),
        port: 0,
        cwd: dir,
        launch_in_ci: ['phantomjs'],
        reporter: reporter
      });

      config.read(function() {
        var app = new App(config, function(exitCode) {
          expect(exitCode).to.eq(0);
          expect(reporter.results[0].result.logs).to.deep.eq([
            { type: 'log', text: '\'log - test\'\n' },
            { type: 'warn', text: '\'warn - test\'\n' },
            { type: 'error', text: '\'error - test\'\n' },
            { type: 'info', text: '\'info - test\'\n' }
          ]);

          done();
        });
        app.start();
      });
    });
  });

  it('fails with explicitly defined missing launchers', function(done) {
    var config = new Config('ci', {
      file: 'tests/fixtures/basic_test/testem.json',
      port: 0,
      cwd: path.join('tests/fixtures/basic_test/'),
      launch_in_ci: ['opera'],
      reporter: new FakeReporter()
    });
    config.read(function() {
      var app = new App(config, function(exitCode, err) {
        expect(exitCode).to.eq(1);
        expect(err.message).to.eq('Launcher opera not found. Not installed?');
        done();
      });
      app.start();
    });
  });

  it('passes when missing launchers are ignored', function(done) {
    var config = new Config('ci', {
      file: 'tests/fixtures/basic_test/testem.json',
      port: 0,
      cwd: path.join('tests/fixtures/basic_test/'),
      launch_in_ci: ['opera'],
      ignore_missing_launchers: true,
      reporter: new FakeReporter()
    });
    config.read(function() {
      var app = new App(config, function(exitCode) {
        expect(exitCode).to.eq(0);
        done();
      });
      app.start();
    });
  });

  it('allows passing in reporter from config', function(done) {
    var fakeReporter = new FakeReporter();
    var config = new Config('ci', {
      reporter: fakeReporter
    });
    var app = new App(config, function() {
      assert.strictEqual(app.reporter, fakeReporter);
      done();
    });

    sandbox.stub(app, 'triggerRun');

    app.start();
    app.exit();
  });

  it('wrapUp reports error to reporter', function(done) {
    var reporter = new FakeReporter();
    var app = new App(new Config('ci', {
      reporter: reporter
    }), function() {
      assert.equal(reporter.total, 1);
      assert.equal(reporter.pass, 0);
      var result = reporter.results[0].result;
      assert.equal(result.name, 'Error');
      assert.equal(result.error.message, 'blarg');
      done();
    });

    sandbox.stub(app, 'triggerRun');

    app.start();
    app.wrapUp(new Error('blarg'));
  });

  it('does not shadow EADDRINUSE errors', function(done) {
    var server = http.createServer().listen(7357, function(err) {
      if (err) {
        return done(err);
      }
      var reporter = new FakeReporter();
      var config = new Config('ci', {
        cwd: path.join('tests/fixtures/basic_test'),
        launch_in_ci: ['phantomjs'],
        reporter: reporter
      });
      config.read(function() {
        var app = new App(config, function(exitCode, err) {
          expect(exitCode).to.eq(1);
          expect(err).to.match(/EADDRINUSE/);
          expect(reporter.results[0].result.error.message).to.contain('EADDRINUSE');
          server.close(done);
        });
        app.start();
      });
    });
  });

  it('stops the server if an error occurs', function(done) {
    var error = new Error('Error: foo');
    var app = new App(new Config('ci', {
      reporter: new FakeReporter()
    }), function(exitCode, err) {
      expect(exitCode).to.eq(1);
      expect(err).to.eq(error);
      assert(app.stopServer.called, 'stop server should be called');
      done();
    });
    sandbox.spy(app, 'stopServer');

    sandbox.stub(app, 'triggerRun');
    app.start();
    app.wrapUp(error);
  });

  it('kills launchers on wrapUp', function(done) {
    var app = new App(new Config('ci', {
      launch_in_ci: []
    }), function() {
      assert(app.killRunners.called, 'clean up launchers should be called');
      done();
    });

    sandbox.spy(app, 'killRunners');

    sandbox.stub(app, 'triggerRun');
    app.start(function() {
      app.exit();
    });
  });

  // Convert to disposer unit test
  xit('cleans up idling launchers', function(done) {
    var app = new App(new Config('ci'), function(exitCode, err) {
      if (err) {
        return done(err);
      }

      expect(app.runners[0].exit).to.have.been.called();
      done();
    });
    app.runners = [
      {
        stop: function(cb) {
          return Bluebird.resolve().asCallback(cb);
        }
      }
    ];

    sandbox.spy(app.runners[0], 'exit');

    app.exitRunners(function() {
      expect(app.runners[0].exit).to.have.been.called();

      app.exit();
    });
  });

  it('timeout does not wait for idling launchers', function(done) {
    var config = new Config('ci', {
      port: 0,
      cwd: path.join('tests/fixtures/fail_later'),
      timeout: 2,
      launch_in_ci: ['phantomjs'],
      reporter: new TestReporter(true)
    });
    config.read(function() {
      var app = new App(config);
      var start = Date.now();
      sandbox.stub(app, 'cleanExit', function() {
        assert.lengthOf(app.runners, 1, 'There must be one runner');
        assert(Date.now() - start < 30000, 'Timeout does not wait for test to finish if it takes too long');
        done();
      });
      app.start();
    });
  });

  it('returns with non zero exit code and reports an error when a hook was not executable', function(done) {
    var reporter = new TestReporter(true);
    var config = new Config('ci', {
      port: 0,
      cwd: path.join('tests/fixtures/basic_test'),
      before_tests: 'not-found',
      launch_in_ci: ['phantomjs'],
      reporter: reporter
    });
    config.read(function() {
      var app = new App(config, function(exitCode) {
        expect(exitCode).to.eq(1);
        var result = reporter.results[0].result;

        expect(result.launcherId).to.eq(0);
        expect(result.error.message).to.contain('not-found');
        done();
      });
      app.start();
    });
  });

  describe('getExitCode', function() {

    it('returns 0 if all passed', function() {
      var app = new App(new Config('ci'));
      var reporter = { total: 1, pass: 1 };
      app.reporter = reporter;
      assert.equal(app.getExitCode(), null);
    });

    it('returns 0 if all skipped', function() {
      var app = new App(new Config('ci'));
      var reporter = { total: 1, skipped: 1 };
      app.reporter = reporter;
      assert.equal(app.getExitCode(), null);
    });

    it('returns 1 if fails', function() {
      var app = new App(new Config('ci'));
      var reporter = { total: 1, pass: 0 };
      app.reporter = reporter;
      assert.match(app.getExitCode(), /Not all tests passed/);
    });

    it('returns 0 if no tests ran', function() {
      var app = new App(new Config('ci'));
      var reporter = { total: 0, pass: 0 };
      app.reporter = reporter;
      assert.equal(app.getExitCode(), null);
    });

    it('returns 1 if no tests and fail_on_zero_tests config is on', function() {
      var app = new App(new Config('ci', {
        fail_on_zero_tests: true
      }));
      var reporter = { total: 0, pass: 0 };
      app.reporter = reporter;
      assert.match(app.getExitCode(), /No tests found\./);
    });

  });

  it('runs two browser instances in parallel with different test pages', function(done) {
    var reporter = new TestReporter(true);
    var config = new Config('ci', {
      file: 'tests/fixtures/multiple_pages/testem.json',
      port: 0,
      cwd: path.join('tests/fixtures/multiple_pages'),
      launch_in_ci: ['phantomjs'],
      reporter: reporter
    });
    config.read(function() {
      var app = new App(config, function(exitCode) {
        assert.lengthOf(app.runners, 2, 'two runners are used');

        var firstLauncher = app.runners[0].launcher;
        var secondLauncher = app.runners[1].launcher;

        assert.equal(firstLauncher.name, 'PhantomJS', 'first launcher is phantomjs');
        assert.equal(secondLauncher.name, 'PhantomJS', 'second launcher is also phantomjs');

        assert.notEqual(firstLauncher.getUrl(), secondLauncher.getUrl(), 'the launchers used different urls');

        assert.equal(exitCode, 0);
        done();
      });
      app.start();
    });
  });
});
