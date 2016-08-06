'use strict';

var fs = require('fs');
var expect = require('chai').expect;
var path = require('path');

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
          app.triggerRun('restart');

          app.once('testRun', function() {
            app.exit(new Error('Run killed.'));
          });
        });
      });
    });
  });
});
