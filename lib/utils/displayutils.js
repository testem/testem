'use strict';

// Method to format test results.
const strutils = require('./strutils');

function resultDisplay(id, prefix, result, strictSpecCompliance) {
  let parts = [];

  if (prefix) {
    parts.push(prefix);
  }

  parts.push(`[${result.runDuration} ms]`);

  if (result.name) {
    parts.push(result.name.trim());
  }

  let line = parts.join(' - ');

  let status;
  let directive;

  if (result.skipped) {
    if (strictSpecCompliance) {
      status = 'ok';
      directive = 'skip';
    } else {
      status = 'skip';
    }
  } else if (result.passed && !result.todo) {
    status = 'ok';
  } else if (!result.passed && result.todo) {
    if (strictSpecCompliance) {
      status = 'not ok';
      directive = 'todo';
    } else {
      status = 'todo';
    }
  } else if (result.passed && result.todo) {
    if (strictSpecCompliance) {
      status = 'ok';
      directive = 'bonus';
    } else {
      // Not expected to pass
      status = 'not ok';
    }
  } else {
    status = 'not ok';
  }

  let output = status + ' ' + id + ' ' + line;
  if (directive) {
    output += ' # ' + directive;
  }

  return output;
}

function yamlDisplay(err, logs, logProcessor) {
  let testLogs;
  let failed = Object.keys(err || {})
    .filter(key => key !== 'passed')
    .map(key => key + ': >\n' + strutils.indent(String(err[key])));
  if (logs) {
    testLogs = ['browser log: |'].concat(
      logs.map((log) => {
        let logLine;
        if (strutils.isString(log)) {
          logLine = log;
        }
        else if (logProcessor) {
          logLine = logProcessor(log);
        }
        else {
          logLine = JSON.stringify(log);
        }
        return strutils.indent(logLine);
      })
    );
  } else {
    testLogs = [];
  }
  return strutils.indent([
    '---',
    strutils.indent(failed.concat(testLogs).join('\n')),
    '...'
  ].join('\n'));
}

function resultString(id, prefix, result, quietLogs, strictSpecCompliance, logProcessor) {
  let string = resultDisplay(id, prefix, result, strictSpecCompliance) + '\n';
  if (result.error || (!quietLogs && result.logs && result.logs.length)) {
    string += yamlDisplay(result.error, result.logs, logProcessor) + '\n';
  }
  return string;
}

exports.resultString = resultString;

function summaryDisplay() {
  let lines = [
    '1..' + this.total,
    '# tests ' + this.total,
    '# pass  ' + this.pass,
    '# skip  ' + this.skipped,
    '# todo  ' + this.todo,
    '# fail  ' + (this.total - this.pass - this.skipped - this.todo)
  ];

  if (this.pass + this.skipped + this.todo === this.total) {
    lines.push('');
    lines.push('# ok');
  }
  return lines.join('\n');
}

exports.summaryDisplay = summaryDisplay;
