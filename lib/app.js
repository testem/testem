var EventEmitter = require('events').EventEmitter;
var async = require('async');
var Path = require('path');
var Process = require('did_it_work');
var log = require('npmlog');
var StyledString = require('styled_string');
var _ = require('lodash');

var Server = require('./server');
var BrowserTestRunner = require('./runners/browser_test_runner');
var ProcessTestRunner = require('./runners/process_test_runner');
var TapProcessTestRunner = require('./runners/tap_process_test_runner');
var reporters = require('./reporters');
var HookRunner = require('./hook_runner');
var cleanExit = require('./clean_exit');
var isa = require('./isa');
var ReportFile = require('./report_file');
var FileWatcher = require('./file_watcher');
var Launcher = require('./launcher');

function App(config, finalizer) {
  this.exited = false;
  this.paused = false;
  this.config = config;
  this.stdoutStream = config.get('stdout_stream') || process.stdout;
  this.server = new Server(this.config);
  this.Process = Process;
  this.hookRunners = {};
  this.results = [];
  this.runnerIndex = 0;
  this.runners = [];
  this.timeoutID = undefined;

  this.reportFileName = this.config.get('report_file');
  this.reportFileStream = this.initReportFileStream(this.reportFileName);
  this.reporter = this.initReporter(this.config.get('reporter'), this.reportFileStream);
  if (!this.reporter) {
    this.cleanExit(new Error(
      'Test reporter `' + this.config.get('reporter') + '` not found.'
    ));
  }

  this.cleanExit = function(err) {
    var alreadyExit = false;
    var exit = function() {
      if (!alreadyExit) {
        alreadyExit = true;

        var exitCode = err ? 1 : 0;
        (finalizer || cleanExit)(exitCode, err);
      }
    };

    if (this.reportFile) {
      this.untilReportFileStreamFinished(exit);
    } else {
      exit();
    }
  };
}

App.prototype = {
  __proto__: EventEmitter.prototype,
  initReportFileStream: function(path) {
    if (path) {
      this.reportFile = new ReportFile(path, this.stdoutStream);

      // Exit only when report file stream ended
      this.reportFile.fileStream.on('finish', this.finishReportFileStream.bind(this));
      this.reportFile.fileStream.on('close', this.finishReportFileStream.bind(this));
      this.reportFile.fileStream.on('error', this.finishReportFileStream.bind(this));

      return this.reportFile.stream;
    } else {
      return this.stdoutStream;
    }

  },
  initReporter: function(reporter, stream) {
    if (isa(reporter, String)) {
      var TestReporter = reporters[reporter];
      if (!TestReporter) {
        return null;
      }
      return new TestReporter(false, stream, this.config, this);
    } else {
      return reporter;
    }
  },

  start: function(cb) {
    log.info('Starting ' + this.config.appMode);

    async.series([
      this.addSignalListeners.bind(this),
      this.configureFileWatch.bind(this),
      this.startServer.bind(this),
      this.createRunners.bind(this),
      this.runHook.bind(this, 'on_start')
    ], function(err) {
      if (err) {
        return this.exit(err);
      }

      this.triggerRun('Start');

      if (cb) {
        cb(err);
      }
    }.bind(this));
  },

  triggerRun: function(src) {
    log.info(src + ' triggered test run.');
    this.stopCurrentRun(function() {
      this.runTests();
    }.bind(this));
  },

  stopCurrentRun: function(cb) {
    if (this.stopping) {
      return;
    }
    this.stopping = true;

    this.cleanUpProcessLaunchers(function() {
      this.stopping = false;
      cb();
    }.bind(this));
  },

  runTests: function(err, cb) {
    if (this.paused) {
      if (cb) {
        return cb();
      } else {
        return;
      }
    }
    log.info('Running tests...');

    async.series([
      this.runHook.bind(this, 'before_tests'),
      this.startClock.bind(this),
      this.singleRun.bind(this),
      this.runHook.bind(this, 'after_tests'),
    ], function(err) {
      if (cb) {
        cb(err);
      }
      if (this.config.get('single_run')) {
        this.exit(err);
      }
    }.bind(this));
  },

  exit: function(err, cb) {
    if (this.exited) {
      if (cb) {
        cb(err);
      }
      return;
    }
    this.exited = true;

    log.info('Stopping ' + this.config.appMode);

    this.cancelExistingTimeout();

    if (err) {
      this.reporter.report(null, {
        passed: false,
        name: err.name || 'unknown error',
        error: {
          message: err.message
        }
      });
    }
    this.reporter.finish();

    // Close the file report stream
    if (this.reportFile) {
      this.reportFile.stream.end();
    }

    this.emit('tests-finish');
    this.stopHookRunners();

    async.series([
      this.runHook.bind(this, 'on_exit'),
      this.cleanUpLaunchers.bind(this),
      this.stopServer.bind(this),
      this.removeSignalListeners.bind(this)
    ], function(cleanupErr) {
      err = err || cleanupErr || this.getExitCode();
      this.cleanExit(err);
      if (cb) {
        cb(err);
      }
    }.bind(this));
  },

  startServer: function(callback) {
    log.info('Starting server');
    this.server = new Server(this.config);
    this.server.on('file-requested', this.onFileRequested.bind(this));
    this.server.on('browser-login', this.onBrowserLogin.bind(this));
    this.server.on('server-error', this.onServerError.bind(this));
    this.server.start(callback);
  },

  onFileRequested: function(filepath) {
    if (this.fileWatcher && !this.config.get('serve_files')) {
      this.fileWatcher.add(filepath);
    }
  },

  onServerError: function(err) {
    this.exit(err);
  },

  runHook: function(/*hook, [data], callback*/) {
    var hook = arguments[0];
    var callback = arguments[arguments.length - 1];
    var data = arguments.length > 2 ? arguments[1] : {};
    var runner = this.hookRunners[hook] = new HookRunner(this.config, this.Process);
    runner.run(hook, data, callback);
  },

  onBrowserLogin: function(browserName, id, socket) {
    var browser = _.find(this.runners, function(runner) {
      return runner.pending && runner.id === id;
    });

    if (!browser) {
      var launcher = new Launcher(browserName, {
        id: id,
        protocol: 'browser'
      }, this.config);
      browser = new BrowserTestRunner(launcher, this.reporter, this.runnerIndex++);
      this.addRunner(browser);
    }

    browser.tryAttach(browserName, id, socket);
  },

  addRunner: function(runner) {
    this.runners.push(runner);
    this.emit('runnerAdded', runner);
  },

  configureFileWatch: function(cb) {
    if (this.config.get('disable_watching')) {
      return cb(null);
    }

    this.fileWatcher = new FileWatcher(this.config);
    this.fileWatcher.on('fileChanged', function(filepath) {
      log.info(filepath + ' changed (' + (this.disableFileWatch ? 'disabled' : 'enabled') + ').');
      if (this.disableFileWatch || this.paused) {
        return;
      }
      var configFile = this.config.get('file');
      if ((configFile && filepath === Path.resolve(configFile)) ||
        (this.config.isCwdMode() && filepath === process.cwd())) {
        // config changed
        this.configure(function() {
          this.triggerRun('Config changed');
        }.bind(this));
      }else {
        this.runHook('on_change', {file: filepath}, function() {
          this.triggerRun('File changed: ' + filepath);
        }.bind(this));
      }
    }.bind(this));
    this.fileWatcher.on('EMFILE', function() {
      var view = this.view;
      var text = [
        'The file watcher received a EMFILE system error, which means that ',
        'it has hit the maximum number of files that can be open at a time. ',
        'Luckily, you can increase this limit as a workaround. See the directions below \n \n',
        'Linux: http://stackoverflow.com/a/34645/5304\n',
        'Mac OS: http://serverfault.com/a/15575/47234'
      ].join('');
      view.setErrorPopupMessage(new StyledString(text + '\n ').foreground('megenta'));
    }.bind(this));

    cb(null);
  },

  createRunners: function(callback) {
    var self = this;
    var reporter = this.reporter;
    this.config.getLaunchers(function(err, launchers) {
      if (err) {
        return callback(err);
      }

      launchers.forEach(function(launcher) {
        var runner = self.createTestRunner(launcher, reporter);
        self.addRunner(runner);
      });
      callback(null);
    });
  },

  getRunnerFactory: function(launcher) {
    var protocol = launcher.protocol();
    switch (protocol){
      case 'process':
        return ProcessTestRunner;
      case 'browser':
        return BrowserTestRunner;
      case 'tap':
        return TapProcessTestRunner;
      default:
        throw new Error('Don\'t know about ' + protocol + ' protocol.');
    }
  },

  createTestRunner: function(launcher, reporter) {
    var singleRun = this.config.get('single_run');

    return new (this.getRunnerFactory(launcher))(launcher, reporter, this.runnerIndex++, singleRun);
  },

  startClock: function(callback) {
    var self = this;
    var timeout = this.config.get('timeout');
    if (timeout) {
      this.cancelExistingTimeout();
      this.timeoutID = setTimeout(function() {
        self.wrapUp(new Error('Timed out after ' + timeout + 's'));
      }, timeout * 1000);
    }
    callback(null);
  },

  cancelExistingTimeout: function() {
    clearTimeout(this.timeoutID);
    this.timeoutID = null;
  },

  singleRun: function(callback) {
    var limit = this.config.get('parallel');
    if (limit !== -1) {
      async.eachLimit(this.runners, limit, function(runner, next) {
        runner.start(next);
      }, callback);
    } else {
      async.each(this.runners, function(runner, next) {
        runner.start(next);
      }, callback);
    }
  },

  wrapUp: function(err) {
    this.exit(err);
  },

  stopServer: function(callback) {
    if (!this.server) {
      return callback();
    }

    this.server.stop(callback);
  },

  stopHookRunners: function() {
    for (var runner in this.hookRunners) {
      this.hookRunners[runner].stop();
    }
  },

  getExitCode: function() {
    if (this.reporter.total > ((this.reporter.pass || 0) + (this.reporter.skipped || 0))) {
      return new Error('Not all tests passed.');
    }
    if (this.reporter.total === 0 && this.config.get('fail_on_zero_tests')) {
      return new Error('No tests found.');
    }
    return null;
  },

  addSignalListeners: function(callback) {
    this._boundSigInterrupt = function() {
      this.wrapUp(new Error('Received SIGINT signal'));
    }.bind(this);
    process.on('SIGINT', this._boundSigInterrupt);

    this._boundSigTerminate = function() {
      this.wrapUp(new Error('Received SIGTERM signal'));
    }.bind(this);
    process.on('SIGTERM', this._boundSigTerminate);

    callback();
  },

  removeSignalListeners: function(callback) {
    if (this._boundSigInterrupt) {
      process.removeListener('SIGINT', this._boundSigInterrupt);
    }
    if (this._boundSigTerminate) {
      process.removeListener('SIGTERM', this._boundSigTerminate);
    }
    callback();
  },

  cleanUpProcessLaunchers: function(callback) {
    var processLaunchers = this.launchers().filter(function(launcher) {
      return launcher.isProcess();
    });
    async.forEach(processLaunchers, function(launcher, done) {
      launcher.kill('SIGTERM', done);
    }, callback);
  },

  cleanUpLaunchers: function(callback) {
    var launchers = this.launchers();
    async.forEach(launchers, function(launcher, done) {
      launcher.kill('SIGTERM', done);
    }, callback);
  },

  launchers: function() {
    return this.runners.map(function(runner) {
      return runner.launcher;
    });
  },

  finishReportFileStream: function() {
    this.reportFileFinished = true;
    if (this.reportFileFinishedCb) {
      this.reportFileFinishedCb();
      this.reportFileFinishedCb = null;
    }
  },

  untilReportFileStreamFinished: function(cb) {
    if (this.reportFileFinished) {
      return cb();
    }

    this.reportFileFinishedCb = cb;
  }
};

module.exports = App;
