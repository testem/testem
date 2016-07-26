'use strict';

var TapConsumer = require('../tap_consumer');
var log = require('npmlog');
var Bluebird = require('bluebird');

function TapProcessTestRunner(launcher, reporter) {
  this.launcher = launcher;
  this.reporter = reporter;
  this.launcherId = this.launcher.id;
  this.finished = false;
  log.info(this.launcher.name);
}
TapProcessTestRunner.prototype = {
  start: function(onFinish) {
    this.onStart();
    this.finished = false;

    this.tapConsumer = new TapConsumer();
    this.tapConsumer.on('test-result', this.onTestResult.bind(this));
    this.tapConsumer.on('all-test-results', this.onAllTestResults.bind(this));

    this.launcher.once('processError', this.onProcessError.bind(this));
    this.launcher.once('processStarted', this.onProcessStart.bind(this));

    return new Bluebird.Promise(function(resolve) {
      this.onFinish = resolve;
      this.launcher.start();
    }.bind(this)).asCallback(onFinish);
  },
  stop: TapProcessTestRunner.prototype.exit,
  exit: function(cb) {
    // TODO Fix those likely not removed
    this.launcher.removeListener('processError', this.onProcessError.bind(this));
    this.launcher.removeListener('processStarted', this.onProcessStart.bind(this));
    return this.launcher.kill(null, cb);
  },
  onTestResult: function(test) {
    test.launcherId = this.launcherId;
    this.reporter.report(this.launcher.name, test);
  },
  onAllTestResults: function() {
    setTimeout(function() { // Workaround Node 0.10 finishing stdout before receiving process error
      this.wrapUp();
    }.bind(this), 100);
  },
  wrapUp: function() {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.onEnd();
    this.onFinish();
  },
  name: function() {
    return this.launcher.name;
  },
  onProcessError: function(code, err, stdout, stderr) {
    var result = {
      failed: 1,
      name: 'error',
      launcherId: this.launcherId,
      error: {
        message: 'Error: ' + err + ' Stderr: ' + stderr + ' Stdout: ' + stdout
      }
    };

    this.reporter.report(this.launcher.name, result);
    this.wrapUp();
  },
  onProcessStart: function(process) {
    process.stdout.pipe(this.tapConsumer.stream);
  },
  onStart: function() {
    if (!this.reporter.onStart) {
      return;
    }

    this.reporter.onStart(this.launcher.name, {
      launcherId: this.launcher.id
    });
  },

  onEnd: function() {
    if (!this.reporter.onEnd) {
      return;
    }

    this.reporter.onEnd(this.launcher.name, {
      launcherId: this.launcher.id
    });
  }
};

module.exports = TapProcessTestRunner;
