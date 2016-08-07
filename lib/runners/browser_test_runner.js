'use strict';

var log = require('npmlog');
var BrowserTapConsumer = require('../browser_tap_consumer');
var util = require('util');
var Bluebird = require('bluebird');

function BrowserTestRunner(launcher, reporter, index, singleRun) {
  this.launcher = launcher;
  this.reporter = reporter;
  this.running = false;
  this.index = index;
  this.launcherId = this.launcher.id;
  this.singleRun = singleRun;
  this.logs = [];

  this.pendingTimer = undefined;
  this.onProcessExitTimer = undefined;
}

BrowserTestRunner.prototype = {
  start: function(onFinish) {
    if (this.pending) {
      return;
    }

    this.finished = false;
    this.pending = true;

    return new Bluebird.Promise(function(resolve) {
      this.onFinish = resolve;

      if (this.socket) {
        this.socket.emit('start-tests');
      } else {
        this._boundOnProcessExit = this.onProcessExit.bind(this);
        this.launcher.on('processExit', this._boundOnProcessExit);
        this.launcher.start();
        this.setupStartTimer();
      }
    }.bind(this)).finally(this.removeListeners.bind(this)).asCallback(onFinish);
  },

  removeListeners: function() {
    if (!this._boundOnProcessExit) {
      return;
    }
    this.launcher.removeListener('processExit', this._boundOnProcessExit);
  },

  stop: function(cb) {
    if (this.socket) {
      this.socket.emit('stop-run');
    }
    return Bluebird.resolve().asCallback(cb);
  },

  exit: function(cb) {
    log.info('Closing browser ' + this.name() + '.');
    this.removeListeners();
    return this.launcher.kill(null, cb);
  },

  setupStartTimer: function() {
    var self = this;
    this.startTimer = setTimeout(function() {
      if (self.finished || !self.pending) {
        return;
      }

      var name = 'Browser ' + self.launcher.commandLine() +
        ' failed to connect. testem.js not loaded?';

      name += addDetails(self.launcher);

      var result = {
        failed: 1,
        name: name
      };
      self.onTestResult.call(self, result);
      self.finish();
    }, this.launcher.config.get('browser_start_timeout') * 1000);
  },

  tryAttach: function(browser, id, socket) {
    if (id !== this.launcherId) {
      return;
    }

    log.info('tryAttach', browser, id);

    if (this.startTimer) {
      clearTimeout(this.startTimer);
    }
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
    }

    this.pending = false;
    this.socket = socket;
    this.browser = browser;
    this.logs = [];

    this.onStart.call(this);

    socket.on('test-result', this.onTestResult.bind(this));
    socket.on('test-metadata', this.onTestMetadata.bind(this));
    socket.on('top-level-error', this.onGlobalError.bind(this));

    var handleMessage = function(type) {
      return function(/* ...args */) {
        var args = Array.prototype.slice.call(arguments);
        var message = args.map(function(arg) {
          return util.inspect(arg);
        }).join(' ');

        this.logs.push({
          type: type,
          text: message + '\n'
        });
      }.bind(this);
    }.bind(this);

    for (var method in ['log', 'warn', 'error', 'info']) {
      socket.on('console-' + method, handleMessage(method));
    }

    socket.on('disconnect', this.onDisconnect.bind(this));

    socket.on('all-test-results', this.onAllTestResults.bind(this));
    socket.on('after-tests-complete', this.onAfterTests.bind(this));

    var tap = new BrowserTapConsumer(socket);
    tap.on('test-result', this.onTestResult.bind(this));
    tap.on('all-test-results', this.onAllTestResults.bind(this));
    tap.on('all-test-results', function() {
      this.socket.emit('tap-all-test-results');
    }.bind(this));
  },

  name: function() {
    return this.launcher.name;
  },

  onTestResult: function(result) {
    var errItems = (result.items || [])
      .filter(function(item) {
        return !item.passed;
      });

    this.reporter.report(this.browser, {
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

  onTestMetadata: function(tag, metadata) {
    if (!this.reporter.reportMetadata) {
      return;
    }

    this.reporter.reportMetadata(tag, metadata);
  },

  onStart: function() {
    if (!this.reporter.onStart) {
      return;
    }

    this.reporter.onStart(this.browser, {
      launcherId: this.launcherId
    });
  },
  onEnd: function() {
    if (!this.reporter.onEnd) {
      return;
    }

    this.reporter.onEnd(this.browser, {
      launcherId: this.launcherId
    });
  },
  onAllTestResults: function() {
    log.info('Browser ' + this.name() + ' finished all tests.', this.singleRun);
    this.onEnd();
  },
  onAfterTests: function() {
    this.finish();
  },
  onGlobalError: function(msg, url, line) {
    var message = msg + ' at ' + url + ', line ' + line + '\n';
    this.logs.push({
      type: 'error',
      text: message
    });

    var config = this.launcher.config;
    if (config.get('bail_on_uncaught_error')) {
      this.onTestResult.call(this, {
        failed: 1,
        name: 'Global error: ' + msg + ' at ' + url + ', line ' + line + '\n',
        logs: [],
        error: {}
      });
      this.onAllTestResults();
      this.onEnd.call(this);
    }
  },
  onDisconnect: function() {
    var self = this;

    if (this.finished) { return; }

    this.pending = true;
    this.pendingTimer = setTimeout(function() {
      if (self.finished) {
        return;
      }

      var name = 'Browser ' + self.launcher.commandLine() + ' disconnected unexpectedly.';

      name += addDetails(self.launcher);

      var result = {
        failed: 1,
        name: name
      };
      self.onTestResult.call(self, result);
      self.finish();
    }, this.launcher.config.get('browser_disconnect_timeout') * 1000);
  },
  onProcessExit: function(code) {
    if (this.finished) { return; }

    var self = this;
    this.onProcessExitTimer = setTimeout(function() {
      if (self.finished) {
        return;
      }

      var name = 'Browser ' + self.launcher.commandLine() +
        ' exited unexpectedly with exit code ' + code + '.';

      name += addDetails(self.launcher);

      var result = {
        failed: 1,
        name: name
      };
      self.onTestResult.call(self, result);
      self.finish();
    }, 1000);
  },
  finish: function() {
    if (this.finished) { return; }

    clearTimeout(this.pendingTimer);
    clearTimeout(this.onProcessExitTimer);

    this.finished = true;
    if (!this.singleRun) {
      if (this.onFinish) {
        this.onFinish();
      }
      return;
    }
    return this.exit(this.onFinish);
  }
};

function addDetails(launcher) {
  var details = '';

  if (launcher.stdout) {
    details += '\nStdout: \n' + launcher.stdout;
  }

  if (launcher.stderr) {
    details += '\nStderr: \n' + launcher.stderr;
  }

  return details;
}

module.exports = BrowserTestRunner;
