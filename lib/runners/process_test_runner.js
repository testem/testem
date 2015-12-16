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
    this.finish(null, code, stdout, stderr);
  },

  name: function() {
    return this.launcher.name;
  },

  onProcessError: function(code, err, stdout, stderr) {
    this.lastErr = err;
    this.finish(err, code, stdout, stderr);
  },

  finish: function(err, code, stdout, stderr) {
    var logs = [];
    var message = '';

    if (err) {
      logs.push({
        type: 'error',
        text: err.toString()
      });

      message += 'Error: \n ' + err + '\n';
    }

    if (stderr) {
      logs.push({
        type: 'error',
        text: stderr
      });

      message += 'Stderr: \n ' + stderr + '\n';
    }

    if (stdout) {
      logs.push({
        type: 'log',
        text: stdout
      });

      message += 'Stdout: \n ' + stdout + '\n';
    }

    var result = {
      passed: code === 0 && !err,
      name: this.launcher.name,
      launcherId: this.launcherId,
      logs: logs
    };
    if (!result.passed) {
      result.error = {
        message: message
      };
    }

    this.reporter.report(this.launcher.name, result);
    this.onFinish();
  }
};

module.exports = ProcessTestRunner;
