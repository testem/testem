var log = require('npmlog');
var BrowserTapConsumer = require('../browser_tap_consumer');
var util = require('util');

function BrowserTestRunner(launcher, reporter, index, singleRun) {
  this.launcher = launcher;
  this.reporter = reporter;
  this.running = false;
  this.index = index;
  this.id = this.launcher.id;
  this.singleRun = singleRun;
}

BrowserTestRunner.prototype = {
  start: function(onFinish) {
    this.onFinish = onFinish;
    this.finished = false;
    this.pending = true;

    if (this.socket) {
      this.socket.emit('start-tests');
    } else {
      this.launcher.on('processExit', this.onProcessExit.bind(this));
      this.launcher.start();
    }
  },

  tryAttach: function(browser, id, socket) {
    if (id !== this.id) {
      return;
    }

    log.info('tryAttach', browser, id);

    var self = this;
    if (this.pending) {
      clearTimeout(this.pending);
    }
    this.pending = false;
    this.socket = socket;

    var runner = {
      browserName: browser,
      reporter: this.reporter,
      logs: [],
      launcherId: this.launcher.id
    };

    this.onStart.call(runner);

    var config = this.launcher.config;

    socket.on('test-result', this.onTestResult.bind(runner));

    socket.on('top-level-error', function(msg, url, line) {
      var message = msg + ' at ' + url + ', line ' + line + '\n';
      runner.logs.push({
        type: 'error',
        text: message
      });

      if (config.get('bail_on_uncaught_error')) {
        self.onTestResult.call(runner, {
          passed: false,
          name: 'Global error: ' + msg + ' at ' + url + ', line ' + line + '\n',
          logs: [],
          error: {}
        });
        self.onAllTestResults();
        self.onEnd.call(runner);
      }
    });

    var handleMessage = function(type) {
      return function(/* ...args */) {
        var args = Array.prototype.slice.call(arguments);
        var message = args.map(function(arg) {
          return util.inspect(arg);
        }).join(' ');

        runner.logs.push({
          type: type,
          text: message + '\n'
        });
      };
    };

    socket.on('error', handleMessage('error'));
    socket.on('info', handleMessage('info'));
    socket.on('warn', handleMessage('warn'));
    socket.on('log', handleMessage('log'));

    socket.on('disconnect', function() {
      browser.pending = setTimeout(function() {
        if (self.finished) {
          return;
        }

        var result = {
          passed: false,
          name: 'Browser ' + self.launcher.commandLine() + ' disconnected unexpectedly.'
        };
        self.reporter.report(self.name(), result);
        self.finish();
      }, 1000);
    });

    socket.on('all-test-results', this.onAllTestResults.bind(this));
    socket.on('all-test-results', this.onEnd.bind(runner));

    var tap = new BrowserTapConsumer(socket);
    tap.on('test-result', this.onTestResult.bind(runner));
    tap.on('all-test-results', this.onAllTestResults.bind(this));
  },

  name: function() {
    return this.launcher.name;
  },

  onTestResult: function(result) {
    var errItems = (result.items || [])
      .filter(function(item) {
        return !item.passed;
      });

    this.reporter.report(this.browserName, {
      passed: !result.failed && !result.skipped,
      name: result.name,
      skipped: result.skipped,
      runDuration: result.runDuration,
      logs: this.logs,
      error: errItems[0],
      launcherId: this.launcherId,
      failed: result.failed,
      pending: result.pending,
      items: result.items
    });
    this.logs = [];
  },
  onStart: function() {
    if (!this.reporter.onStart) {
      return;
    }

    this.reporter.onStart(this.browserName, {
      launcherId: this.launcherId
    });
  },
  onEnd: function() {
    if (!this.reporter.onEnd) {
      return;
    }

    this.reporter.onEnd(this.browserName, {
      launcherId: this.launcherId
    });
  },
  onAllTestResults: function() {
    log.info('Browser ' + this.name() + ' finished all tests.', this.singleRun);

    this.finish();
  },
  onProcessExit: function(code) {
    var self = this;

    setTimeout(function() {
      if (self.finished) {
        return;
      }
      var result = {
        passed: false,
        name: 'Browser ' + self.launcher.commandLine() + ' exited unexpectedly with exit code ' + code + '.'
      };
      self.reporter.report(self.name(), result);
      self.finish();
    }, 1000);
  },
  finish: function() {
    if (this.finished) {
      return;
    }
    this.finished = true;
    if (!this.singleRun) {
      if (this.onFinish) {
        this.onFinish();
      }
      return;
    }
    return this.quit(this.onFinish);
  },
  quit: function(cb) {
    log.info('Closing browser ' + this.name() + '.');
    this.launcher.kill(null, cb);
  }
};

module.exports = BrowserTestRunner;
