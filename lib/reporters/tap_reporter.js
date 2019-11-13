'use strict';

const displayutils = require('../utils/displayutils');

module.exports = class TapReporter {
  constructor(silent, out, config) {
    this.out = out || process.stdout;
    this.silent = silent;
    this.quietLogs = !!config.get('tap_quiet_logs');
    this.failsOnly = !!config.get('tap_failed_tests_only');
    this.stoppedOnError = null;
    this.id = 1;
    this.total = 0;
    this.pass = 0;
    this.skipped = 0;
    this.results = [];
    this.errors = [];
    this.logs = [];
  }

  report(prefix, data) {
    this.results.push({
      launcher: prefix,
      result: data
    });
    this.display(prefix, data);
    this.total++;
    if (data.skipped) {
      this.skipped++;
    } else if (data.passed) {
      this.pass++;
    }
  }

  summaryDisplay() {
    let lines = [
      '1..' + this.total,
      '# tests ' + this.total,
      '# pass  ' + this.pass,
      '# skip  ' + this.skipped,
      '# fail  ' + (this.total - this.pass - this.skipped)
    ];

    if (this.pass + this.skipped === this.total) {
      lines.push('');
      lines.push('# ok');
    }
    return lines.join('\n');
  }

  /*
   * Based on current settings in this object, will the given value be
   * displayed by 'display'? 
   */
  willDisplay(result) {
    let show = !this.silent && (!this.failsOnly || result.error);
    return show;
  }

  /*
   * Display a formatted message for the result, but only if 
   * we've configured to do that.
   */
  display(prefix, result) {
    if (willDisplay(result))
      this.out.write(displayutils.resultString(this.id++, prefix, result, this.quietLogs));
    }
  }

  finish() {
    if (this.silent) {
      return;
    }
    this.out.write('\n' + this.summaryDisplay() + '\n');
  }
};
