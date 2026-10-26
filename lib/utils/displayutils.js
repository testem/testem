import * as strutils from "./strutils.js";

// Method to format test results.

function resultDisplay(id, prefix, result, strictSpecCompliance) {
  let parts = [];

  if (prefix) {
    parts.push(prefix);
  }

  if (typeof result.runDuration === 'number') {
    parts.push(`[${result.runDuration} ms]`);
  }

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

function logLine(log, logProcessor) {
  if (strutils.isString(log)) {
    return log;
  } else if (logProcessor) {
    return logProcessor(log);
  }
  return JSON.stringify(log);
}

function valueDisplay(value) {
  if (strutils.isString(value)) {
    return value;
  }
  try {
    let json = JSON.stringify(value, null, 2);
    if (json !== undefined) {
      return json;
    }
  } catch {
    // fall through, e.g. for circular structures
  }
  return String(value);
}

function yamlDisplay(err, logs, logProcessor) {
  let testLogs;
  let failed = Object.keys(err || {})
    .filter(key => key !== 'passed')
    .map(key => key + ': >\n' + strutils.indent(valueDisplay(err[key])));
  if (logs) {
    testLogs = ['browser log: |'].concat(
      logs.map(log => strutils.indent(logLine(log, logProcessor)))
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

export { resultString };

// Logs that don't belong to a test result, e.g. written after the last test,
// as TAP comments.
function logsString(prefix, logs, logProcessor) {
  let lines = [(prefix ? prefix + ' - ' : '') + 'browser log:'].concat(
    logs.map(log => strutils.indent(logLine(log, logProcessor)))
  );
  return lines.join('\n').split('\n').map(line => '# ' + line).join('\n') + '\n';
}

export { logsString };
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

export { summaryDisplay };