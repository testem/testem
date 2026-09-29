
var toResult = require('./to-result');

class ProcessTestRunner {
  constructor(launcher, reporter) {
    this.launcher = launcher;
    this.reporter = reporter;
    this.launcherId = this.launcher.id;
    this.finished = false;
  }

  async start(onFinish) {
    this.onStart();
    this.finished = false;

    let finished = new Promise(resolve => {
      this.onFinish = resolve;
    });

    try {
      this.process = await this.launcher.start();
      this.process.once('processExit', this.onProcessExit.bind(this));
      this.process.once('processError', this.onProcessError.bind(this));

      await finished;
    } catch (err) {
      if (onFinish) {
        onFinish(err);
      }
      throw err;
    }

    if (onFinish) {
      onFinish(null);
    }
  }

  exit() {
    if (!this.process) {
      return Promise.resolve();
    }

    return this.process.kill();
  }

  onProcessExit(code, stdout, stderr) {
    this.finish(null, code, stdout, stderr);
  }

  name() {
    return this.launcher.name;
  }

  onProcessError(err, stdout, stderr) {
    this.lastErr = err;
    this.lastStderr = stderr;
    this.finish(err, 0, stdout, stderr);
  }

  onStart() {
    this.reporter.onStart(this.launcher.name, {
      launcherId: this.launcherId
    });
  }

  onEnd() {
    this.reporter.onEnd(this.launcher.name, {
      launcherId: this.launcherId
    });
  }

  finish(err, code) {
    if (this.finished) {
      return;
    }
    this.finished = true;
    var runnerProcess = this.process;
    this.process = null;

    var result = toResult(this.launcherId, err, code, runnerProcess);
    this.reporter.report(this.launcher.name, result);
    this.onEnd();

    this.onFinish();
  }
}

module.exports = ProcessTestRunner;
