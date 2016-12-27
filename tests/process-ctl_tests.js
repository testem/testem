'use strict';

var Bluebird = require('bluebird');
var path = require('path');
var sinon = require('sinon');
var expect = require('chai').expect;

var ProcessCtl = require('../lib/process-ctl');

var isWin = /^win/.test(process.platform);
var isNodeLt012 = require('./support/is-node-lt-012');

describe('ProcessCtl', function() {
  describe('spawn', function() {
    var processCtl;

    beforeEach(function() {
      processCtl = new ProcessCtl('test');
    });

    it('emits a processStarted event', function() {
      var processStartedEvent = false;

      processCtl.on('processStarted', function() {
        processStartedEvent = true;
      });

      return processCtl.spawn('node', ['-v']).then(function(p) {
        return new Bluebird.Promise(function(resolve) {
          return p.on('processExit', resolve);
        }).then(function(exitCode) {
          expect(exitCode).to.eq(0);
          expect(processStartedEvent).to.be.true();
        });
      });
    });

    it('saves stdout', function() {
      var inline = 'console.log(process.argv.slice(1).join(\' \'))';
      return processCtl.spawn('node', ['-e', inline, 'out']).then(function(p) {
        return new Bluebird.Promise(function(resolve) {
          return p.on('processExit', function(exitCode, stdout, stderr) {
            resolve([exitCode, stdout, stderr]);
          });
        }).spread(function(exitCode, stdout, stderr) {
          expect(exitCode).to.eq(0);
          expect(p.stdout).to.eq('out\n');
          expect(stdout).to.eq('out\n');
          expect(stderr).to.eq('');
        });
      });
    });

    it('saves stderr', function() {
      var inline = 'console.error(process.argv.slice(1).join(\' \'))';
      return processCtl.spawn('node', ['-e', inline, 'err']).then(function(p) {
        return new Bluebird.Promise(function(resolve) {
          return p.on('processExit', function(exitCode, stdout, stderr) {
            resolve([exitCode, stdout, stderr]);
          });
        }).spread(function(exitCode, stdout, stderr) {
          expect(exitCode).to.eq(0);
          expect(p.stderr).to.eq('err\n');
          expect(stdout).to.eq('');
          expect(stderr).to.eq('err\n');
        });
      });
    });

    it('copies the current environment', function() {
      process.env.TESTEM_USER_CONFIG = 'TESTEM_CONFIG';
      return processCtl.spawn('node', ['-e', 'console.log(process.env.TESTEM_USER_CONFIG)']).then(function(p) {
        return new Bluebird.Promise(function(resolve) {
          return p.on('processExit', resolve);
        }).then(function(exitCode) {
          delete process.env.TESTEM_USER_CONFIG;

          expect(exitCode).to.eq(0);
          expect(p.stdout).to.eq('TESTEM_CONFIG\n');
        });
      });
    });

    it('adds the local node modules to the path', function() {
      return processCtl.spawn('node', ['-e', 'console.log(process.env.PATH)']).then(function(p) {

        return new Bluebird.Promise(function(resolve) {
          return p.on('processExit', resolve);
        }).then(function(exitCode) {
          expect(exitCode).to.eq(0);
          expect(p.stdout).to.contain(path.join(process.cwd(), 'node_modules', '.bin'));
        });
      });
    });

    it('is able to run executables inside the local node modules', function() {
      return processCtl.spawn('mocha', ['-V']).then(function(p) {
        return new Bluebird.Promise(function(resolve) {
          return p.on('processExit', resolve);
        }).then(function(exitCode) {
          expect(exitCode).to.eq(0);
        });
      });
    });

    it('allows to specify multiple executables', function() {
      return processCtl.spawn(['nodeFound', 'mocha', 'node'], ['-h']).then(function(p) {
        return new Bluebird.Promise(function(resolve) {
          return p.on('processExit', resolve);
        }).then(function(exitCode) {
          expect(exitCode).to.eq(0);
          expect(p.stdout).to.contain('mocha');
        });
      });
    });

    it('fails when no executable was found', function() {
      return processCtl.spawn(['notFound']).catch(function(err) {
        expect(err.toString()).to.eq('Error: No executable found in: [ \'notFound\' ]');
      });
    });
  });

  describe('exec', function() {
    var processCtl, sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      processCtl = new ProcessCtl('test');
    });

    beforeEach(function() {
      sandbox.restore();
    });

    it('supports commands with quotes', function() {
      sandbox.spy(processCtl, 'spawn');
      return processCtl.exec('echo "hello world"').then(function(p) {
        return new Bluebird.Promise(function(resolve) {
          return p.on('processExit', resolve);
        }).then(function(exitCode) {
          expect(exitCode).to.eq(0);
          if (isWin) {
            expect(p.stdout).to.eq('"hello world"\r\n');
          } else {
            expect(p.stdout).to.eq('hello world\n');
          }
          expect(processCtl.spawn).to.have.been.calledWith(
            'echo', ['"hello world"'], { shell: true }
          );
        });
      });
    });
  });

  describe('kill', function() {
    var processCtl;

    beforeEach(function() {
      processCtl = new ProcessCtl('test', { killTimeout: 50 });
    });

    it('kills regular processes', function() {
      var fixture = [path.join(__dirname, 'fixtures/processes/echo.js')];
      return processCtl.spawn('node', fixture).delay(500).then(function(p) {
        return p.kill().then(function(exitCode) {
          if (isNodeLt012()) {
            expect(exitCode).to.be.eq(143);
          } else if (isWin) {
            expect(exitCode).to.be.eq(1);
          } else {
            expect(exitCode).to.be.null();
          }
          expect(p._killTimer).to.be.null();
        });
      });
    });

    it('kills processes ignoring sigterm', function() {
      var fixture = [path.join(__dirname, 'fixtures/processes/ignore_sigterm.js')];
      return processCtl.spawn('node', fixture).delay(500).then(function(p) {
        return p.kill().then(function(exitCode) {
          if (isWin) {
            expect(exitCode).to.be.eq(1);
          } else {
            expect(exitCode).to.be.null();
          }
          expect(p._killTimer).to.be.null();
        });
      });
    });
  });

  describe('onStdOut', function() {
    // TODO
  });
});
