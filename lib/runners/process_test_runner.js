function ProcessTestRunner(launcher, reporter) {
  this.launcher = launcher;
  this.reporter = reporter;
  this.launcherId = this.launcher.id;
}
ProcessTestRunner.prototype = {
  start: function(onFinish) {
    this.onFinish = onFinish;

    this.launcher.start();
    this.launcher.once('processExit', this.onProcessExit.bind(this));
    this.launcher.once('processError', this.onProcessError.bind(this));
  },

  onProcessExit: function(code, stdout, stderr) {
    var logs = [];
    if (stdout) {
      logs.push({
        type: 'log',
        text: stdout
      });
    }

    if (stderr) {
      logs.push({
        type: 'error',
        text: stderr
      });
    }

    var result = {
      passed: code === 0,
      name: this.launcher.commandLine(),
      launcherId: this.launcherId,
      logs: logs
    };
    if (!result.passed) {
      result.error = {
        stdout: stdout,
        stderr: stderr
      };
    }
    this.reporter.report(this.launcher.name, result);
    this.onFinish();
  },

  name: function() {
    return this.launcher.name;
  },

  onProcessError: function(err, stdout, stderr) {
    var logs = [{
      type: 'error',
      text: err
    }];

    if (stdout) {
      logs.push({
        type: 'log',
        text: stdout
      });
    }

    if (stderr) {
      logs.push({
        type: 'error',
        text: stderr
      });
    }

    var result = {
      passed: false,
      name: this.launcher.commandLine(),
      launcherId: this.launcherId,
      logs: logs,
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

module.exports = ProcessTestRunner;
