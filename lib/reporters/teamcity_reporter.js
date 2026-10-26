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

function withFlowId(attributes, flowId) {
  return flowId === undefined ? attributes : Object.assign(attributes, {flowId: escape(flowId)});
}

// Results that belong to testem itself rather than to a launcher: errors from
// hooks or timeouts (`launcherId: 0`, see lib/app.js) and errors reported by
// lib/utils/reporter.js (no prefix, no launcherId).
function isTestemResult(prefix, data) {
  return data.launcherId === 0 || (data.launcherId === undefined && !prefix);
}

export default class TeamcityReporter {
  constructor(silent, out, config) {
    this.out = out || process.stdout;
    this.silent = silent;
    this.stoppedOnError = null;
    this.id = 1;
    this.total = 0;
    this.pass = 0;
    this.skipped = 0;
    this.startTime = new Date();
    this.endTime = null;

    // Nesting is only guaranteed correct when launchers run one after another
    // (`parallel: 1`, the default): a launcher's suite can then be closed as
    // soon as the next one starts reporting. With concurrent launchers the
    // output stays flat.
    const parallel = config ? config.get('parallel') : 1;
    const sequential = parallel === undefined || parseInt(parallel, 10) === 1;
    this.nestByLauncher = !!(config && config.get('teamcity_nest_by_launcher')) && sequential;
    // launcher key -> escaped suite name, in the order the suites were opened
    this.openSuites = new Map();
  }

  report(prefix, data) {
    if (this.nestByLauncher) {
      this._reportNested(prefix, data);
    } else {
      const name = namify(prefix, data);
      this.out.write(teamcityLine('testStarted', {name}));
      this._display(prefix, data);
      this.out.write(teamcityLine('testFinished', Object.assign(
        {name},
        runDurationAttribute(data)
      )));
    }
    this.total++;
    if (data.skipped) {
      this.skipped++;
    } else if (data.passed) {
      this.pass++;
    }
  }

  onEnd(name, opts) {
    if (!this.nestByLauncher) {
      return;
    }
    const launcherId = opts && opts.launcherId;
    if (launcherId === 0) {
      // testem's own onEnd fires after every launcher is done
      this._closeAllSuites();
    } else {
      this._closeSuite(launcherId);
    }
  }

  finish() {
    if (this.silent) {
      return;
    }
    this.endTime = new Date();
    // Launchers that crashed or timed out never call onEnd.
    this._closeAllSuites();
    this.out.write('\n\n');
  }

  _reportNested(prefix, data) {
    if (this.silent) {
      return;
    }

    if (isTestemResult(prefix, data)) {
      // Keep testem's own errors out of whichever launcher suite is open.
      this._closeAllSuites();
      this._writeTest(prefix || 'testem', data);
      return;
    }

    const key = data.launcherId === undefined ? prefix : data.launcherId;
    if (!this.openSuites.has(key)) {
      this._closeAllSuites();
      const suiteName = escape(prefix);
      this.openSuites.set(key, suiteName);
      this.out.write(teamcityLine('testSuiteStarted', withFlowId({name: suiteName}, key)));
    }
    this._writeTest(null, data, key);
  }

  _writeTest(prefix, data, flowId) {
    const name = namify(prefix, data);
    this.out.write(teamcityLine('testStarted', withFlowId({name}, flowId)));
    this._display(prefix, data, flowId);
    this.out.write(teamcityLine('testFinished', withFlowId(Object.assign(
      {name},
      runDurationAttribute(data)
    ), flowId)));
  }

  _closeSuite(key) {
    const suiteName = this.openSuites.get(key);
    if (suiteName === undefined) {
      return;
    }
    this.openSuites.delete(key);
    this.out.write(teamcityLine('testSuiteFinished', withFlowId({name: suiteName}, key)));
  }

  _closeAllSuites() {
    Array.from(this.openSuites.keys()).forEach(key => this._closeSuite(key));
  }

  _display(prefix, result, flowId) {
    if (this.silent) {
      return;
    }
    const name = namify(prefix, result);

    if (result.skipped) {
      this.out.write(teamcityLine('testIgnored', withFlowId({
        name,
        message: 'pending',
      }, flowId)));
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

      this.out.write(teamcityLine('testFailed', withFlowId(attributes, flowId)));
    }
  }
}
TeamcityReporter.teamcityLine = teamcityLine;
export { teamcityLine };