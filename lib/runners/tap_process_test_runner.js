import TapConsumer from "../tap_consumer.js";
import log from "../log.js";
import toResult from "./to-result.js";

// Builds the error of a failed TAP assertion from its YAML diagnostics
// (e.g. message, operator, expected, actual, at, stack) so reporters print it.
// Without a YAML stack, output following the assertion (e.g. a mocha stack
// trace) is used as the stack. The name isn't used as the message, as the
// result line already shows it.
function toError(item) {
  let error = Object.assign({}, item.diag);
  let output = dedent(item.stack || '');
  if (output && error.stack === undefined && error.at === undefined) {
    error.stack = output;
  }
  return error;
}

function dedent(text) {
  let lines = text.trimEnd().split('\n');
  let width = Math.min(...lines.filter(line => line.trim()).map(line => line.search(/\S/)));
  return lines.map(line => line.slice(width)).join('\n');
}

class TapProcessTestRunner {
  constructor(launcher, reporter) {
    this.launcher = launcher;
    this.reporter = reporter;
    this.launcherId = this.launcher.id;
    this.finished = false;
    log.info(this.launcher.name);
  }

  async start() {
    this.onStart();
    this.finished = false;

    this.tapConsumer = new TapConsumer();
    this.tapConsumer.on('test-result', this.onTestResult.bind(this));
    this.tapConsumer.on('all-test-results', this.onAllTestResults.bind(this));

    let finished = new Promise(resolve => {
      this.resolveRun = resolve;
    });

    try {
      this.process = await this.launcher.start();
      this.process.once('processError', this.onProcessError.bind(this));
      this.process.process.stdout.pipe(this.tapConsumer.stream);
    } catch (err) {
      this.onProcessError(err);
    }

    await finished;
  }

  exit() {
    if (!this.process) {
      return Promise.resolve();
    }

    return this.process.kill();
  }

  onTestResult(test) {
    test.launcherId = this.launcherId;
    let failedItem = (test.items || []).find(item => !item.passed);
    if (failedItem && !test.error) {
      test.error = toError(failedItem);
    }
    this.reporter.report(this.launcher.name, test);
  }

  onAllTestResults() {
    setTimeout(() => { // Workaround Node 0.10 finishing stdout before receiving process error
      this.wrapUp();
    }, 100);
  }

  wrapUp() {
    if (this.finished) {
      return;
    }
    this.finished = true;
    this.process = null;
    this.onEnd();
    this.resolveRun();
  }

  name() {
    return this.launcher.name;
  }

  onProcessError(err) {
    var result = toResult(this.launcherId, err, 0, this.process);
    this.reporter.report(this.launcher.name, result);
    this.wrapUp();
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
}

export default TapProcessTestRunner