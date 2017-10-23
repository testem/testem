'use strict';

class TeamcityReporter {
  constructor(silent, out) {
    this.out = out || process.stdout;
    this.silent = silent;
    this.stoppedOnError = null;
    this.id = 1;
    this.total = 0;
    this.pass = 0;
    this.skipped = 0;
    this.startTime = new Date();
    this.endTime = null;
  }

  report(prefix, data) {
    this.out.write('##teamcity[testStarted name=\'' + this._namify(prefix, data) + '\']\n');
    this._display(prefix, data);
    this.total++;
    if (data.skipped) {
      this.skipped++;
    } else if (data.passed) {
      this.pass++;
    }
  }

  finish() {
    if (this.silent) {
      return;
    }
    this.endTime = new Date();
    this.out.write('\n\n');
    this.out.write('##teamcity[testSuiteFinished name=\'testem.suite\' duration=\'' + this._duration() + '\']\n');
    this.out.write('\n\n');
  }

  _display(prefix, result) {
    if (this.silent) {
      return;
    }
    if (result.skipped) {
      this.out.write('##teamcity[testIgnored name=\'' + this._namify(prefix, result) + '\' message=\'pending\']\n');
    } else if (!result.passed) {
      var message = (result.error && result.error.message) || '';
      var stack = (result.error && result.error.stack) || '';
      this.out.write('##teamcity[testFailed name=\'' + this._namify(prefix, result) + '\' message=\'' + escape(message) + '\' details=\'' + escape(stack) + '\']\n');
    }
    this.out.write('##teamcity[testFinished name=\'' + this._namify(prefix, result) + '\'' + this._runDurationAttribute(result) + ']\n');

  }

  _namify(prefix, result) {
    var line = (prefix ? (prefix + ' - ') : '') +
      result.name.trim();
    return escape(line);
  }

  _duration() {
    return Math.round((this.endTime - this.startTime));
  }

  _runDurationAttribute(result) {
    return typeof result.runDuration === 'number' ? ' duration=\'' + result.runDuration + '\'' : '';
  }
}

/**
 * Borrowed from https://github.com/travisjeffery/mocha-teamcity-reporter
 * Escape the given `str`.
 */

function escape(str) {
  if (!str) {
    return '';
  }
  return str
    .toString()
    .replace(/\|/g, '||')
    .replace(/\n/g, '|n')
    .replace(/\r/g, '|r')
    .replace(/\[/g, '|[')
    .replace(/\]/g, '|]')
    .replace(/\u0085/g, '|x')
    .replace(/\u2028/g, '|l')
    .replace(/\u2029/g, '|p')
    .replace(/'/g, '|\'');
}

module.exports = TeamcityReporter;
