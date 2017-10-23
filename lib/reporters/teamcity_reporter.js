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
    this.prefixedResults = {};
  }

  report(prefix, data) {
    var _prefix = prefix ? prefix : 'testem.suite';
    this.prefixedResults[_prefix] = this.prefixedResults[_prefix] || [];
    this.prefixedResults[_prefix].push(data);
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

    for (var prefix in this.prefixedResults) {
      if (this.prefixedResults.hasOwnProperty(prefix)) {
        this.out.write('##teamcity[testSuiteStarted name=\''+prefix+'\']\n');
        this.prefixedResults[prefix].forEach(this._display.bind(this));
        this.out.write('##teamcity[testSuiteFinished name=\''+prefix+'\']\n');
      }
    }

    this.out.write('\n\n');
  }

  _display(result) {
    if (this.silent) {
      return;
    }

    var name = this._namify(result);

    this.out.write('##teamcity[testStarted name=\'' + name + '\']\n');

    if (result.skipped) {
      this.out.write('##teamcity[testIgnored name=\'' + name + '\' message=\'pending\']\n');
    } else if (!result.passed) {
      var message = (result.error && result.error.message) || '';
      var stack = (result.error && result.error.stack) || '';

      this.out.write('##teamcity[testFailed name=\'' + name + '\' message=\'' + escape(message) + '\' details=\'' + escape(stack) + '\']\n');
    }

    this.out.write('##teamcity[testFinished name=\'' + name + '\'' + this._runDurationAttribute(result) + ']\n');
  }

  _namify(result) {
    return escape(result.name.trim());
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
