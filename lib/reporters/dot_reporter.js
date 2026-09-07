

const { inspect } = require('util');
const indent = require('../utils/strutils').indent;
const displayutils = require('../utils/displayutils');

module.exports = class DotReporter {
  constructor(silent, out) {
    this.out = out || process.stdout;
    this.silent = silent;
    this.stoppedOnError = null;
    this.id = 1;
    this.total = 0;
    this.pass = 0;
    this.skipped = 0;
    this.todo = 0;
    this.results = [];
    this.startTime = new Date();
    this.endTime = null;
    this.currentLineChars = 0;
    this.maxLineChars = Math.min(this.out.columns || 65, 65) - 5;
    this.out.write('\n');
    this.out.write('  ');
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
    } else if (data.passed && !data.todo) {
      this.pass++;
    } else if (!data.passed && data.todo) {
      this.todo++;
    }
  }

  display(prefix, result) {
    if (this.silent) {
      return;
    }
    if (this.currentLineChars > this.maxLineChars) {
      this.currentLineChars = 0;
      this.out.write('\n  ');
    }
    if (result.passed && !result.todo) {
      this.out.write('.');
    } else if (!result.passed && result.todo) {
      this.out.write('T');
    } else if (result.skipped) {
      this.out.write('*');
    } else {
      this.out.write('F');
    }
    this.currentLineChars += 1;
  }

  finish() {
    if (this.silent) {
      return;
    }
    this.endTime = new Date();
    this.out.write('\n\n');
    this.out.write(this.summaryDisplay());
    this.out.write('\n\n');
    this.displayErrors();
  }

  displayErrors() {
    this.results.forEach((data, idx) => {
      let result = data.result;
      let error = result.error;
      if (!error) {
        return;
      }

      this.out.write(`${String(idx + 1).padStart(3)}) [${data.launcher}] ${result.name}\n`);

      if (error.message) {
        this.out.write(`     ${error.message}\n`);
      }

      if ('expected' in error && 'actual' in error) {
        this.out.write('\n' +
               `     expected: ${error.negative ? 'NOT ' : ''}${inspect(error.expected)}\n` +
               `       actual: ${inspect(error.actual)}\n`);
      }

      if (error.stack) {
        this.out.write(`\n${indent(error.stack, 5)}`);
      }

      this.out.write('\n\n');
    }, this);
  }

  summaryDisplay() {
    let lines = [
      `[duration - ${this.duration()} ms]`,
      displayutils.summaryDisplay.call(this),
    ];
    return lines.join('\n');
  }

  duration() {
    return Math.round((this.endTime - this.startTime));
  }
};
