'use strict';

var fs = require('fs');
var path = require('path');
var Bluebird = require('bluebird');
var os = require('os');

var sinon = require('sinon');
var expect = require('chai').expect;
var tmp = require('tmp');

var HookRunner = require('../../lib/runners/hook_runner');
var isWin = require('../../lib/utils/is-win')();

var tmpNameAsync = Bluebird.promisify(tmp.tmpName);
// fs.access would be enough, but isn't supported in Node 0.10
var fsStatAsync = Bluebird.promisify(fs.stat);
var fsReadFileAsync = Bluebird.promisify(fs.readFile);

describe('HookRunner', function() {
  var config, hook;

  beforeEach(function() {
    hook = null;
    config = {
      get: function(key) {
        switch (key) {
          case 'test_hook':
            return hook;
          case 'port':
            return 7357;
          case 'host':
            return '0.0.0.0';
          case 'url':
            return 'http://0.0.0.0:7357/';
        }
      },
      cwd: process.cwd
    };
  });

  describe('run', function() {
    var hookRunner, sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      hookRunner = new HookRunner(config);
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('runs hook', function() {
      hook = 'echo hello';
      return hookRunner.run('test_hook', {}).then(function(result) {
        expect(result.stdout).to.eq('hello' + os.EOL);
      });
    });

    it('adds the local node modules to the path', function() {
      hook = { exe: 'node', args: ['-e', 'console.log(process.env.PATH)'] };

      return hookRunner.run('test_hook', {}).then(function(result) {
        expect(result.stdout).to.contain(path.join(process.cwd(), 'node_modules', '.bin'));
      });
    });

    it('runs hook with arguments', function() {
      hook = 'echo <type>';

      return hookRunner.run('test_hook', {type: 'soviet'}).then(function(result) {
        expect(result.stdout).to.eq('soviet' + os.EOL);
      });
    });

    it('runs javascript hook', function() {
      hook = function(cfg, data, callback) {
        expect(cfg.get('port')).to.eq(7357);
        expect(data.viva).to.eq('la revolucion');
        callback(new Error('hookError'));
      };

      return hookRunner.run('test_hook', {viva: 'la revolucion'}).then(function() {
        expect(true).to.eq('hook should throw.');
      }).catch(function(err) {
        expect(err.message).to.eq('hookError');
      });
    });

    it('waits for text', function() {
      hook = {
        exe: 'node',
        args: ['-e', 'console.log("launched."); process.stdin.resume();'],
        wait_for_text: 'launched.'
      };

      return hookRunner.run('test_hook', {});
    });

    it('fails without text within timeout', function() {
      hook = {
        exe: 'node',
        args: ['-e', 'console.log("waiting..."); process.stdin.resume();'],
        wait_for_text: 'launched.',
        wait_for_text_timeout: 10
      };

      return hookRunner.run('test_hook', {}).then(function() {
        throw new Error('Hook should have failed.');
      }).catch(function(err) {
        expect(err.message).to.eq('Timed out without seeing "launched."');
      });
    });

    it('fails with bad text', function() {
      hook = {
        exe: 'node',
        args: ['-e', 'console.log("badText..."); process.stdin.resume();'],
        bad_text: 'badText.'
      };

      return hookRunner.run('test_hook', {}).then(function() {
        throw new Error('Hook should have failed.');
      }).catch(function(err) {
        expect(err.message).to.eq('Found bad match (badText.)\nHook: test_hook\nStdout:\nbadText...\n\nStderr:\n');
      });
    });

    it('succeeds without bad text in timeout', function() {
      hook = {
        exe: 'node',
        args: ['-e', 'console.log("no-bad-text."); process.stdin.resume();'],
        bad_text: 'badText.',
        bad_text_timeout: 10
      };

      return hookRunner.run('test_hook', {});
    });

    it('substitutes port and host', function() {
      hook = {
        command: 'echo <host>:<port> -u <url>'
      };

      return hookRunner.run('test_hook', {}).then(function(result) {
        expect(result.stdout).to.eq('0.0.0.0:7357 -u http://0.0.0.0:7357/' + os.EOL);
      });
    });

    it('launches via spawn and replaces in args', function() {
      hook = {
        exe: 'node',
        args: ['-e', 'console.log("<port>");']
      };

      return hookRunner.run('test_hook', {}).then(function(result) {
        expect(result.stdout).to.eq('7357\n');
      });
    });

    it('copies the user environment on exec', function() {
      var originalEnv = process.env;
      process.env.TESTEM_USER_CONFIG = 'copied';

      var command = 'echo ';
      if (isWin) {
        command += '%TESTEM_USER_CONFIG%';
      } else {
        command += '$TESTEM_USER_CONFIG';
      }

      hook = {
        command: command
      };

      return hookRunner.run('test_hook', {}).then(function(result) {
        process.env = originalEnv;
        expect(result.stdout).to.eq('copied' + os.EOL);
      });
    });

    it('copies the user environment on spawn', function() {
      var originalEnv = process.env;
      process.env.TESTEM_USER_CONFIG = 'copied';

      hook = {
        exe: 'node',
        args: ['-e', 'console.log(process.env.TESTEM_USER_CONFIG)']
      };

      return hookRunner.run('test_hook', {}).then(function(result) {
        process.env = originalEnv;
        expect(result.stdout).to.eq('copied\n');
      });
    });

    it('dies if neither command or exe specified', function() {
      hook = {};

      return hookRunner.run('test_hook', {viva: 'la revolucion'}).catch(function(err) {
        expect(err.message).to.eq('No command or exe/args specified for hook test_hook');
      });
    });

    it('runs the commands in a shell', function() {
      hook = {
        command: 'echo *.js'
      };

      return hookRunner.run('test_hook', {}).then(function(result) {
        if (isWin) {
          expect(result.stdout).to.match(/\*.js/);
        } else {
          expect(result.stdout).to.match(/testem.js/);
        }
      });
    });
  });

  describe('try', function() {
    it('cleans any running process', function() {
      this.timeout(10000);

      return tmpNameAsync().then(function(tmpPath) {
        hook = {
          exe: 'node',
          args: [ path.join(__dirname, '../fixtures/processes/background-hook.js'), tmpPath ],
          wait_for_text: 'Ready!',
          wait_for_text_timeout: 5000
        };

        return Bluebird.using(HookRunner.with(config, 'test_hook'), function() {
          return fsStatAsync(tmpPath);
        }).then(function() {
          return fsReadFileAsync(tmpPath);
        }).then(function(pid) {
          try {
            process.kill(pid);
            expect('true').to.be.false(); // The above should throw
          } catch (e) {
            expect(e.message).to.match(/ESRCH/); // Process shouldn't exist
          }
        });
      });
    });
  });
});
