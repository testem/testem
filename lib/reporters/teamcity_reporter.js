function namify(prefix, result) {
  let line = (prefix ? (prefix + ' - ') : '') +
    result.name.trim();

  return escape(line);
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

function teamcityLine(type, options) {
  const attributes = Object.keys(options)
    .map(attributeName => `${attributeName}='${options[attributeName]}'`)
    .join(' ');

  return `##teamcity[${type} ${attributes}]\n`;
}

function runDurationAttribute(result) {
  return typeof result.runDuration === 'number' ? {duration: result.runDuration} : undefined;
}

export default class TeamcityReporter {
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
    const suite = prefix ? prefix : 'testem.suite';
    this.prefixedResults[suite] = this.prefixedResults[suite] || [];
    this.prefixedResults[suite].push(data);
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

    Object.keys(this.prefixedResults).forEach(prefix => {
      const name = escape(prefix);
      this.out.write(teamcityLine('testSuiteStarted', {name}));
      this.prefixedResults[prefix].forEach(result => this._display(null, result));
      this.out.write(teamcityLine('testSuiteFinished', {name}));
    });

    this.out.write('\n\n');
  }

  _display(prefix, result) {
    if (this.silent) {
      return;
    }
    const name = namify(prefix, result);
    this.out.write(teamcityLine('testStarted', {name}));

    if (result.skipped) {
      this.out.write(teamcityLine('testIgnored', {
        name,
        message: 'pending',
      }));
    } else if (!result.passed) {
      const hasError = result.error;
      const attributes = {name};

      const message = (hasError && result.error.message) || '';
      const stack = (hasError && result.error.stack) || '';

      attributes.message = escape(message);
      attributes.details = escape(stack);

      if (
        hasError &&
        Object.prototype.hasOwnProperty.call(result.error, 'expected') &&
        Object.prototype.hasOwnProperty.call(result.error, 'actual')
      ) {
        attributes.type = 'comparisonFailure';
        attributes.expected = (result.error.negative ? 'NOT ' : '') + escape(result.error.expected);
        attributes.actual = escape(result.error.actual);
      }

      this.out.write(teamcityLine('testFailed', attributes));
    }

    this.out.write(teamcityLine('testFinished', Object.assign(
      {name},
      runDurationAttribute(result)
    )));
  }
}
TeamcityReporter.teamcityLine = teamcityLine;
export { teamcityLine };