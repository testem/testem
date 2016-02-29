function ProcessTestRunner(launcher, reporter) {
  this.launcher = launcher;
  this.reporter = reporter;
  this.launcherId = this.launcher.id;
  this.finished = false;
}
ProcessTestRunner.prototype = {
  start: function(onFinish) {
    this.onStart();
    this.onFinish = onFinish;
    this.finished = false;

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

  finish: function(err, code, stdout, stderr) {
    if (this.finished) {
      return;
    }
    this.finished = true;

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
      failed: code === 0 && !err ? 0 : 1,
      passed: code === 0 && !err ? 1 : 0,
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
    this.onEnd();
    this.onFinish();
  }
};

module.exports = ProcessTestRunner;
