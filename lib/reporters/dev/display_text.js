const Chars = require('../../utils/chars');
const indent = require('../../utils/strutils').indent;

function failureDisplay(item) {
  const extra = [];
  let stacktrace = item.stack;
  if (stacktrace) {
    const stacklines = stacktrace.split('\n');
    if (stacklines[0] === item.message) {
      stacktrace = stacklines.slice(1).map(function (line) {
        return line.trim();
      }).join('\n');
    }
    extra.push(stacktrace);
  } else {
    if (item.file) {
      extra.push(item.file);
    }
    if (item.line) {
      extra.push(' ' + item.line);
    }
  }

  if (item.expected) {
    extra.push(' expected ' + (item.negative ? 'NOT ' : '') + item.expected);
  }

  if (item.actual) {
    extra.push(' actual ' + item.actual);
  }

  if (item.at) {
    extra.push(' at ' + item.at);
  }

  return Chars.cross + ' ' + (item.message || 'failed') +
    (extra ? '\n' + indent(extra.join('\n')) : '');
}

function failedTestDisplay(test) {
  const failedItems = (test.get('items') || []).filter(function (item) {
    return !item.passed;
  });
  return test.get('name') + '\n' +
    indent(failedItems.map(failureDisplay).join('\n'));
}

function getResultsDisplayText(results) {
  const topLevelError = results ? results.get('topLevelError') : null;
  let out = '';
  let pendingOut = '';

  if (topLevelError) {
    out += 'Top Level:\n' + indent(topLevelError) + '\n\n';
  }

  let tests;
  if (results && (tests = results.get('tests')) && !topLevelError) {
    const total = results.get('total');
    const pending = results.get('pending');
    const allDone = results.get('all');
    if (!total) {
      out = allDone ? 'No tests were run :(' : 'Please be patient :)';
    } else {
      const failedTests = tests.filter(function (test) {
        return test.get('failed') > 0;
      });
      if (failedTests.length > 0) {
        out += failedTests.map(failedTestDisplay).join('\n');
      } else if (allDone) {
        const pendingTests = tests.filter(function (test) {
          return test.get('pending') > 0;
        });
        out += Chars.success + ' ' + total + ' tests complete';
        if (pending > 0) {
          out += ' (' + pending + ' pending)';
        }
        out += '.';
        if (pending) {
          pendingOut += '\n\n';
          pendingOut += pendingTests.map(function (test) {
            return '[PENDING] ' + test.get('name');
          }).join('\n');
        }
      } else {
        out += 'Looking good...';
      }
    }
  }

  const segments = [];
  if (out) {
    segments.push({ text: out, color: 'cyan' });
  }
  if (pendingOut) {
    segments.push({ text: pendingOut, color: 'yellow' });
  }
  return segments;
}

function messageColor(type) {
  switch (type) {
    case 'warn':
      return 'cyan';
    case 'info':
      return 'green';
    case 'error':
      return 'red';
    default:
      return 'yellow';
  }
}

function getMessagesText(messages) {
  if (!messages) {
    return [];
  }
  return messages.map(function (message) {
    return {
      text: message.get('text'),
      color: messageColor(message.get('type'))
    };
  });
}

function plainText(segments) {
  return (segments || []).map(function (segment) {
    return segment.text;
  }).join('');
}

module.exports = {
  failureDisplay,
  failedTestDisplay,
  getResultsDisplayText,
  getMessagesText,
  messageColor,
  plainText
};
