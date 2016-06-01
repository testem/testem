'use strict';

var EventEmitter = require('events').EventEmitter;
var Bluebird = require('bluebird');
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

  this.cleanExit = function(err) {
    var alreadyExit = false;
    if (!alreadyExit) {
      alreadyExit = true;

      var exitCode = err ? 1 : 0;
      (finalizer || cleanExit)(exitCode, err);
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

  getReporter: function() {
    var self = this;
    return Bluebird.try(function() {
      self.reportFileStream = self.initReportFileStream(self.reportFileName);
      self.reporter = self.initReporter(self.config.get('reporter'), self.reportFileStream);
      if (!self.reporter) {
        throw new Error('Test reporter `' + self.config.get('reporter') + '` not found.');
      }

      return self.reporter;
    }.bind(this)).disposer(function(reporter, promise) {
      if (promise.isRejected()) {
        var err = promise.reason();

        reporter.report(null, {
          passed: false,
          name: err.name || 'unknown error',
          error: {
            message: err.message
          }
        });
      }

      // Close the file report stream
      if (self.reportFile) {
        self.reportFile.stream.end();
      }

      self.reporter.finish();

      if (self.reportFile) {
        return self.untilReportFileStreamFinished();
      }
    }.bind(this));
  },

  start: function(cb) {
    log.info('Starting ' + this.config.appMode);
    var self = this;

    return Bluebird.using(this.getReporter(), function() {
      return Bluebird.using(self.signalListeners(), function() {
        return Bluebird.using(self.fileWatch(), function() {
          return Bluebird.using(self.getServer(), function() {
            return Bluebird.using(self.getRunners(), function() {
              return Bluebird.using(self.getHookRunners(), function() {
                return self.runHook('on_start').then(function() {
                  var w = self.waitForTests();

                  if (cb) {
                    cb();
                  }

                  return w;
                }).then(function() {
                  log.info('Stopping ' + self.config.appMode);

                  self.emit('tests-finish');

                  return self.runHook('on_exit');
                });
              });
            });
          });
        });
      });
    }).asCallback(this.cleanExit);
  },

  waitForTests: function() {
    var self = this;
    if (this.exited) {
      return Bluebird.reject(this.exitErr || new Error('Testem exited before running any tests.'));
    }

    this.triggerRun('Start');

    return new Bluebird.Promise(function(resolve, reject) {
      self.on('testFinish', resolve);
      self.on('testError', reject);
    });
  },

  triggerRun: function(src) {
    log.info(src + ' triggered test run.');
    var self = this;

    return this.stopCurrentRun().then(function() {
      return self.runTests();
    });
  },

  stopCurrentRun: function(cb) {
    if (this.stopping || !this.currentRun) {
      return Bluebird.resolve();
    }
    this.stopping = true;

    var self = this;

    this.cleanUpProcessLaunchers()

    return this.currentRun.finally(function() {
      self.stopping = false;
    }).asCallback(cb);
  },

  runTests: function(err, cb) {
    if (this.paused) {
      return Bluebird.resolve().asCallback(cb);
    }

    log.info('Running tests...');

    var self = this;

    return this.runHook('before_tests').then(function() {
      return Bluebird.using(self.withTestTimeout(), function() {
        self.currentRun = self.singleRun();
        self.emit('testRun');
        return self.currentRun;
      }).then(function() {
        return self.runHook('after_tests');
      });
    }).then(function() {
      if (self.config.get('single_run')) {
        self.exit();
      }
    }).catch(self.exit.bind(this)).asCallback(cb);
  },

  exit: function(err, cb) {
    err = err || this.getExitCode();

    if (this.exited) {
      if (cb) {
        cb(err);
      }
      return;
    }
    this.exited = true;
    this.exitErr = err;

    if (err) {
      this.emit('testError', err);
    } else {
      this.emit('testFinish');
    }

    if (cb) {
      cb(err);
    }
    return;
  },

  startServer: function(callback) {
    log.info('Starting server');
    this.server = new Server(this.config);
    this.server.on('file-requested', this.onFileRequested.bind(this));
    this.server.on('browser-login', this.onBrowserLogin.bind(this));
    this.server.on('server-error', this.onServerError.bind(this));

    return this.server.start().asCallback(callback);
  },

  getServer: function() {
    var self = this;
    return this.startServer().disposer(function() {
      return self.stopServer();
    });
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

    return Bluebird.fromCallback(function(hookCallback) {
      runner.run(hook, data, hookCallback);
    }).asCallback(callback);
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

  fileWatch: function() {
    return this.configureFileWatch().disposer(function() {
      return;
    });
  },

  configureFileWatch: function(cb) {
    if (this.config.get('disable_watching')) {
      return Bluebird.resolve().asCallback(cb);
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
      } else {
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

    return Bluebird.resolve().asCallback(cb);
  },

  getRunners: function() {
    var self = this;
    return Bluebird.fromCallback(function(callback) {
      self.createRunners(callback);
    }).disposer(function() {
      return self.cleanUpLaunchers();
    });
  },

  createRunners: function(callback) {
    var self = this;
    var reporter = this.reporter;
    this.config.getLaunchers(function(err, launchers) {
      if (err) {
        return callback(err);
      }

      var testPages = self.config.get('test_page');
      launchers.forEach(function(launcher) {
        for (var i = 0; i < testPages.length; i++) {
          var launcherInstance = launcher.create({ test_page: testPages[i] });
          var runner = self.createTestRunner(launcherInstance, reporter);
          self.addRunner(runner);
        }
      });

      callback(null);
    });
  },

  getRunnerFactory: function(launcher) {
    var protocol = launcher.protocol();
    switch (protocol) {
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

  withTestTimeout: function() {
    return this.startClock().disposer(function() {
      return this.cancelExistingTimeout();
    }.bind(this));
  },

  startClock: function(callback) {
    var self = this;
    var timeout = this.config.get('timeout');
    if (timeout) {
      this.timeoutID = setTimeout(function() {
        self.timedOut = true;
        self.cleanUpLaunchers();
      }, timeout * 1000);
    }

    return Bluebird.resolve(this.timeoutID).asCallback(callback);
  },

  cancelExistingTimeout: function() {
    clearTimeout(this.timeoutID);
    this.timeoutID = null;
    this.timedOut = null;
  },

  singleRun: function(callback) {
    var limit = this.config.get('parallel');

    var options = {};

    if (limit && limit >= 1) {
      options.concurrency = parseInt(limit);
    } else {
      options.concurrency = Infinity;
    }

    return Bluebird.map(this.runners, function(runner) {
      if (this.stopping || this.exited) {
        return Bluebird.reject(new Error('Run canceled.'));
      }
      if (this.timedOut) {
        return Bluebird.reject(new Error('Run timed out.'));
      }
      return runner.start();
    }.bind(this), options).asCallback(callback);
  },

  wrapUp: function(err) {
    this.exit(err);
  },

  stopServer: function(callback) {
    if (!this.server) {
      return Bluebird.resolve().asCallback(callback);
    }

    return this.server.stop().asCallback(callback);
  },

  getHookRunners: function() {
    var self = this;

    return Bluebird.resolve().disposer(function() {
      return self.stopHookRunners();
    })
  },

  stopHookRunners: function() {
    var types = Object.keys(this.hookRunners);
    var self = this;

    return Bluebird.map(types, function(type) {
      return self.hookRunners[type].stop(); // TODO Make this wait
    });
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

  signalListeners: function() {
    return this.addSignalListeners().disposer(function() {
      return this.removeSignalListeners();
    }.bind(this));
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

    return Bluebird.resolve().asCallback(callback);
  },

  removeSignalListeners: function(callback) {
    if (this._boundSigInterrupt) {
      process.removeListener('SIGINT', this._boundSigInterrupt);
    }
    if (this._boundSigTerminate) {
      process.removeListener('SIGTERM', this._boundSigTerminate);
    }
    return Bluebird.resolve().asCallback(callback);
  },

  cleanUpProcessLaunchers: function(callback) {
    var processRunners = this.runners.filter(function(runner) {
      return runner.launcher.isProcess();
    });
    return Bluebird.each(processRunners, function(runner) {
      return runner.stop();
    }).asCallback(callback);
  },

  cleanUpLaunchers: function(callback) {
    return Bluebird.each(this.runners, function(runner) {
      return runner.stop();
    }).asCallback(callback);
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
      return Bluebird.resolve().asCallback(cb);
    }

    var self = this;
    return new Bluebird.Promise(function(resolve) {
      self.reportFileFinishedCb = resolve;
    });
  }
};

module.exports = App;
