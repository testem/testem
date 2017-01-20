'use strict';

var Launcher = require('../lib/launcher');
var Config = require('../lib/config');
var expect = require('chai').expect;
var assert = require('chai').assert;
var path = require('path');
var sinon = require('sinon');

var os = require('os');
var isWin = require('../lib/utils/is-win')();

describe('Launcher', function() {
  describe('via command', function() {
    var settings, config, launcher, sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      settings = {command: 'echo hello'};
      config = new Config(null, {port: '7357', url: 'http://blah.com/'});
      launcher = new Launcher('say hello', settings, config);
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should instantiate', function() {
      expect(launcher.name).to.equal('say hello');
      expect(launcher.settings).to.equal(settings);
    });
    it('should be process iff protocol is not browser', function() {
      settings.protocol = 'browser';
      expect(launcher.isProcess()).not.to.be.ok();
      settings.protocol = 'tap';
      expect(launcher.isProcess()).to.be.ok();
      delete settings.protocol;
      expect(launcher.isProcess()).to.be.ok();
    });
    it('should launch if not a process and started', function() {
      sandbox.stub(launcher, 'isProcess').returns(false);
      sandbox.stub(launcher, 'launch');
      launcher.start();
      expect(launcher.launch).to.have.been.called();
    });
    it('substitutes variables', function(done) {
      settings.command = 'echo <url> <port>';
      launcher.start().then(function(launchedProcess) {
        launchedProcess.on('processExit', function(code, stdout) {
          expect(stdout).to.match(/http:\/\/blah.com\/-1 7357(\r\n|\n)/);
          done();
        });
      });
    });
    it('substitutes variables with a random id for browsers', function(done) {
      sandbox.stub(launcher, 'isProcess').returns(false);
      settings.command = 'echo <url> <port>';
      launcher.start().then(function(launchedProcess) {
        launchedProcess.on('processExit', function(code, stdout) {
          expect(stdout).to.match(/http:\/\/blah.com\/([0-9]+) 7357(\r\n|\n)/);
          done();
        });
      });
    });
    it('executes setup', function(done) {
      settings.setup = function(_config) {
        assert.strictEqual(_config, config);
        done();
      };
      launcher.start();
    });
    it('returns exit code, stdout and stderr on processExit', function(done) {
      launcher.start().then(function(launchedProcess) {
        launchedProcess.on('processExit', function(code, stdout) {
          assert.equal(code, 0);
          assert.equal(stdout, 'hello' + os.EOL);
          done();
        });
      });
    });
    it('returns commandLine', function() {
      assert.equal(launcher.commandLine(), '"echo hello"');
    });
    it('copies the current environment', function(done) {
      var originalEnv = process.env;
      process.env.TESTEM_USER_CONFIG = 'copied';

      var command = 'echo ';
      if (isWin) {
        command += '%TESTEM_USER_CONFIG%';
      } else {
        command += '$TESTEM_USER_CONFIG';
      }

      settings.command = command;
      config = new Config();
      launcher.start().then(function(launchedProcess) {
        launchedProcess.on('processExit', function(code, stdout) {
          assert.equal(code, 0);
          assert.equal(stdout, 'copied' + os.EOL);
          process.env = originalEnv;
          done();
        });
      });
    });

    it('adds the local node modules to the path', function(done) {
      var command = 'echo ';
      if (isWin) {
        command += '%PATH%';
      } else {
        command += '$PATH';
      }

      settings.command = command;

      config = new Config();
      launcher.start().then(function(launchedProcess) {
        launchedProcess.on('processExit', function(code, stdout) {
          expect(code).to.eq(0);
          expect(stdout).to.contain(path.join(process.cwd(), 'node_modules', '.bin'));
          done();
        });
      });
    });
  });

  describe('via exe', function() {
    var echoArgs = 'console.log(process.argv.slice(1).join(\' \'))';
    var config, settings, launcher;

    beforeEach(function() {
      config = new Config(null, {port: '7357', url: 'http://blah.com/'});
      settings = {exe: 'node', args: ['-e', echoArgs, 'hello'], test_page: 'tp.html'};
      launcher = new Launcher('test launcher', settings, config);
    });

    it('should launch and also kill it', function(done) {
      launcher.start().then(function(launchedProcess) {
        launchedProcess.on('processExit', function(code, stdout) {
          expect(stdout).to.match(/hello http:\/\/blah.com\/-1\/tp\.html+(\r\n|\n)/);
          done();
        });
      });
    });
    it('should substitute variables for args', function(done) {
      settings.args = ['-e', echoArgs, '<port>', '<url>', '<baseUrl>', '<testPage>', '<id>'];
      launcher.start().then(function(launchedProcess) {
        launchedProcess.on('processExit', function(code, stdout) {
          expect(stdout).to.match(/7357 http:\/\/blah.com\/-1\/tp\.html http:\/\/blah.com\/ tp\.html -1 http:\/\/blah.com\/-1\/tp.html+(\r\n|\n)/);
          done();
        });
      });
    });
    it('calls args as function with config', function(done) {
      settings.args = function(_config) {
        assert.strictEqual(_config, config);
        return ['-e', echoArgs, 'hello'];
      };

      launcher.start().then(function(launchedProcess) {
        launchedProcess.on('processExit', function(code, stdout) {
          expect(stdout).to.eq('hello\n');
          done();
        });
      });
    });

    it('returns exit code and stdout on processExit', function(done) {
      settings.args = function() {
        return ['-e', echoArgs, 'hello'];
      };

      launcher.start().then(function(launchedProcess) {
        launchedProcess.on('processExit', function(code, stdout) {
          assert.equal(code, 0);
          assert.equal(stdout, 'hello\n');
          done();
        });
      });
    });

    it('returns stderr on processExit', function(done) {
      settings.args = function() {
        return ['-e', 'console.error(process.argv.slice(1).join(\' \'))', 'hello'];
      };

      launcher.start().then(function(launchedProcess) {
        launchedProcess.on('processExit', function(code, stdout, stderr) {
          assert.equal(stdout, '');
          assert.equal(stderr, 'hello\n');
          done();
        });
      });
    });

    it('returns commandLine', function() {
      settings.args = function() {
        return ['-e', echoArgs, 'hello'];
      };

      assert.equal(launcher.commandLine(), '"node -e console.log(process.argv.slice(1).join(\' \')) hello"');
    });

    xit('returns commandLine with a single exe', !isWin ? function(done) {
      settings.exe = ['node', 'npm'];
      settings.args = function() {
        return ['-e', 'console.log(1)'];
      };
      launcher.start().then(function(launchedProcess) {
        launchedProcess.on('processExit', function(code, stdout) {
          assert.equal(stdout, '1\n');
          assert.equal(launcher.commandLine(), '"node -e console.log(1)"');
          done();
        });
      });
    } : function() {
      xit('TODO: Fix and re-enable for windows');
    });

    it('copies the current environment', function(done) {
      var originalEnv = process.env;
      process.env.TESTEM_USER_CONFIG = 'copied';

      settings.args = ['-e', 'console.log(process.env.TESTEM_USER_CONFIG)'];
      launcher.start().then(function(launchedProcess) {
        launchedProcess.on('processExit', function(code, stdout) {
          assert.equal(code, 0);
          assert.equal(stdout, 'copied\n');

          process.env = originalEnv;
          done();
        });
      });
    });

    it('returns stderr on processExit', function(done) {
      settings.args = ['-e', 'console.error(\'hello\')'];
      launcher.start().then(function(launchedProcess) {
        launchedProcess.on('processExit', function(code, stdout, stderr) {
          assert.equal(stderr, 'hello\n');
          done();
        });
      });
    });
  });
});
