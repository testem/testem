var TapConsumer = require('../tap_consumer');
var log = require('npmlog');

function TapProcessTestRunner(launcher, reporter) {
  this.launcher = launcher;
  this.tapConsumer = new TapConsumer();
  this.reporter = reporter;
  this.launcherId = this.launcher.id;
  log.info(this.launcher.name);
}
TapProcessTestRunner.prototype = {
  start: function(onFinish) {
    this.onFinish = onFinish;
    this.launcher.start();
    this.launcher.process.stdout.pipe(this.tapConsumer.stream);
    this.launcher.once('processError', this.onProcessError.bind(this));

    this.tapConsumer.on('test-result', this.onTestResult.bind(this));
    this.tapConsumer.on('all-test-results', this.onAllTestResults.bind(this));
  },
  onTestResult: function(test) {
    test.launcherId = this.launcherId;
    this.reporter.report(this.launcher.name, test);
  },
  onAllTestResults: function() {
    this.wrapUp();
  },
  wrapUp: function() {
    this.launcher.kill(null, function() {
      this.onFinish();
    }.bind(this));
  },
  name: function() {
    return this.launcher.name;
  },
  onProcessError: function(err, stdout, stderr) {
    var result = {
      passed: false,
      name: this.launcher.name,
      launcherId: this.launcherId,
      error: {
        err: err,
        stdout: stdout,
        stderr: stderr
      }
    };
    this.reporter.report(this.launcher.name, result);
    this.onFinish();
  }
};

module.exports = TapProcessTestRunner;
