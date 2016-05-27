'use strict';

var Bluebird = require('bluebird');
var path = require('path');

var expect = require('chai').expect;

var ProcessCtl = require('../lib/process-ctl');

var isWin = /^win/.test(process.platform);
var isNodeLt012 = require('./test-utils/is-node-lt-012');

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
      processCtl.spawn('node', ['-v']);

      return new Bluebird.Promise(function(resolve) {
        return processCtl.on('processExit', resolve);
      }).then(function(exitCode) {
        expect(exitCode).to.eq(0);
        expect(processStartedEvent).to.be.true();
      });
    });

    it('saves stdout', function() {
      processCtl.spawn('node', ['-e', 'console.log(process.argv.slice(1).join(\' \'))', 'out']);

      return new Bluebird.Promise(function(resolve) {
        return processCtl.on('processExit', function(exitCode, stdout, stderr) {
          resolve([exitCode, stdout, stderr]);
        });
      }).spread(function(exitCode, stdout, stderr) {
        expect(exitCode).to.eq(0);
        expect(processCtl.stdout).to.eq('out\n');
        expect(stdout).to.eq('out\n');
        expect(stderr).to.eq('');
      });
    });

    it('saves stderr', function() {
      processCtl.spawn('node', ['-e', 'console.error(process.argv.slice(1).join(\' \'))', 'err']);

      return new Bluebird.Promise(function(resolve) {
        return processCtl.on('processExit', function(exitCode, stdout, stderr) {
          resolve([exitCode, stdout, stderr]);
        });
      }).spread(function(exitCode, stdout, stderr) {
        expect(exitCode).to.eq(0);
        expect(processCtl.stderr).to.eq('err\n');
        expect(stdout).to.eq('');
        expect(stderr).to.eq('err\n');
      });
    });

    it('copies the current environment', function() {
      process.env.TESTEM_USER_CONFIG = 'TESTEM_CONFIG';
      processCtl.spawn('node', ['-e', 'console.log(process.env.TESTEM_USER_CONFIG)']);

      return new Bluebird.Promise(function(resolve) {
        return processCtl.on('processExit', resolve);
      }).then(function(exitCode) {
        delete process.env.TESTEM_USER_CONFIG;

        expect(exitCode).to.eq(0);
        expect(processCtl.stdout).to.eq('TESTEM_CONFIG\n');
      });
    });

    it('adds the local node modules to the path', function() {
      processCtl.spawn('node', ['-e', 'console.log(process.env.PATH)']);

      return new Bluebird.Promise(function(resolve) {
        return processCtl.on('processExit', resolve);
      }).then(function(exitCode) {
        expect(exitCode).to.eq(0);
        expect(processCtl.stdout).to.contain(path.join(process.cwd(), 'node_modules', '.bin'));
      });
    });

    it('is able to run executables inside the local node modules', function() {
      processCtl.spawn('mocha', ['-V']);

      return new Bluebird.Promise(function(resolve) {
        return processCtl.on('processExit', resolve);
      }).then(function(exitCode) {
        expect(exitCode).to.eq(0);
      });
    });

    it('allows to specify multiple executables', function() {
      processCtl.spawn(['nodeFound', 'mocha', 'node'], ['-h']);

      return new Bluebird.Promise(function(resolve) {
        return processCtl.on('processExit', resolve);
      }).then(function(exitCode) {
        expect(exitCode).to.eq(0);
        expect(processCtl.stdout).to.contain('mocha');
      });
    });

    it('fails when no executable was found', function() {
      return processCtl.spawn(['notFound']).catch(function(err) {
        expect(err.toString()).to.eq('Error: No executable found in: [ \'notFound\' ]');
      });
    });
  });

  describe('kill', function() {
    var processCtl;

    beforeEach(function() {
      processCtl = new ProcessCtl('test', { killTimeout: 50 });
    });

    it('kills regular processes', function() {
      processCtl.spawn('node', [path.join(__dirname, 'fixtures/processes/echo.js')]);

      return Bluebird.delay(500).then(function() {
        return processCtl.kill();
      }).then(function(exitCode) {
        if (isNodeLt012()) {
          expect(exitCode).to.be.eq(143);
        } else if (isWin) {
          expect(exitCode).to.be.eq(1);
        } else {
          expect(exitCode).to.be.null();
        }
        expect(processCtl._killTimer).to.be.null();
      });
    });

    it('kills processes ignoring sigterm', function() {
      processCtl.spawn('node', [path.join(__dirname, 'fixtures/processes/ignore_sigterm.js')]);

      return Bluebird.delay(500).then(function() {
        return processCtl.kill();
      }).then(function(exitCode) {
        if (isWin) {
          expect(exitCode).to.be.eq(1);
        } else {
          expect(exitCode).to.be.null();
        }
        expect(processCtl._killTimer).to.be.null();
      });
    });
  });
});
