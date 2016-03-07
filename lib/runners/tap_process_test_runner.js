var TapConsumer = require('../tap_consumer');
var log = require('npmlog');

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
    this.onFinish = onFinish;

    this.tapConsumer = new TapConsumer();
    this.tapConsumer.on('test-result', this.onTestResult.bind(this));
    this.tapConsumer.on('after-tests-complete', this.onAllTestResults.bind(this));

    this.launcher.once('processError', this.onProcessError.bind(this));
    this.launcher.start();
    this.launcher.process.stdout.pipe(this.tapConsumer.stream);
  },
  onTestResult: function(test) {
    test.launcherId = this.launcherId;
    this.reporter.report(this.launcher.name, test);
  },
  onAllTestResults: function() {
    this.wrapUp();
  },
  wrapUp: function() {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.launcher.kill(null, function() {
      this.onEnd();
      this.onFinish();
    }.bind(this));
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
  },
};

module.exports = TapProcessTestRunner;
