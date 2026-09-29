const EventEmitter = require('events').EventEmitter;
const { promisify } = require('util');
const { mapLimit } = require('./utils/promises');
const Path = require('path');
const log = require('./log');
const StyledString = require('styled_string');
const _ = require('lodash');

const Server = require('./server');
const BrowserTestRunner = require('./runners/browser_test_runner');
const ProcessTestRunner = require('./runners/process_test_runner');
const TapProcessTestRunner = require('./runners/tap_process_test_runner');
const HookRunner = require('./runners/hook_runner');
const cleanExit = require('./utils/clean_exit');
const FileWatcher = require('./file_watcher');
const LauncherFactory = require('./launcher-factory');

const RunTimeout = require('./utils/run-timeout');
const Reporter = require('./utils/reporter');
const SignalListeners = require('./utils/signal-listeners');

module.exports = class App extends EventEmitter {
  constructor(config, finalizer) {
    super();

    this.exited = false;
    this.paused = false;
    this.config = config;
    this.stdoutStream = config.get('stdout_stream') || process.stdout;
    this.server = new Server(this.config);
    this.results = [];
    this.runnerIndex = 0;
    this.runners = [];
    this.timeoutID = undefined;
    this.testSuiteTimedOut = null;
    this.testSuiteTimedOut = false;

    this.reportFileName = this.config.get('report_file');

    let alreadyExit = false;

    this.cleanExit = (err) => {
      if (!alreadyExit) {
        alreadyExit = true;

        let exitCode = err ? 1 : 0;

        if (err && err.hideFromReporter) {
          err = null;
        }

        if (this.testSuiteTimedOut === true) {
          let timeoutSeconds = this.testSuiteTimeout.timeout;
          err = new Error(
            `Test suite execution has timed out (config.timeout = ${timeoutSeconds} seconds). Terminated all test runners.`,
          );
          exitCode = 1;
        }

        (finalizer || cleanExit)(exitCode, err);
      }
    };
  }

  async start(cb) {
    log.info('Starting ' + this.config.appMode);

    try {
      await SignalListeners.with((signalListeners) => {
        signalListeners.on('signal', (err) => this.exit(err));

        return Reporter.with(
          this,
          this.stdoutStream,
          this.reportFileName,
          (reporter) => {
            this.reporter = reporter;

            return this.run(cb);
          },
        );
      });
    } catch (err) {
      this.cleanExit(err);
      return;
    }

    this.cleanExit();
  }

  async run(cb) {
    try {
      await this.configureFileWatch();

      try {
        await this.startServer();

        try {
          await this.createRunners();
          await this.runSuite(cb);
        } finally {
          await this.killRunners();
        }
      } finally {
        await this.stopServer();
      }
    } finally {
      await this.closeFileWatch();
    }
  }

  async runSuite(cb) {
    try {
      await this.runHook('on_start', undefined, () => {
        let w = this.waitForTests();

        if (cb) {
          cb();
        }

        return w;
      });
    } catch (error) {
      log.error(error);
      log.info('Stopping ' + this.config.appMode);

      this.emit('tests-error');

      await this.runHook('on_exit');

      throw error;
    }

    log.info('Stopping ' + this.config.appMode);

    this.emit('tests-finish');

    await this.runHook('on_exit');
  }

  waitForTests() {
    log.info('Waiting for tests.');

    if (this.exited) {
      return Promise.reject(
        this.exitErr || new Error('Testem exited before running any tests.'),
      );
    }

    let run = this.triggerRun('Start');

    if (this.config.get('single_run')) {
      run.then(() => this.exit());
    }

    return new Promise((resolve, reject) => {
      this.on('testFinish', resolve);
      this.on('testError', reject);
    });
  }

  async triggerRun(src) {
    log.info(src + ' triggered test run.');

    if (this.restarting) {
      return;
    }
    this.restarting = true;

    try {
      await this.stopCurrentRun();
    } catch (err) {
      this.exit(err);
    }

    this.restarting = false;

    return this.runTests();
  }

  stopCurrentRun() {
    if (!this.currentRun) {
      return Promise.resolve();
    }

    return Promise.all([this.stopRunners(), this.currentRun]);
  }

  async runTests() {
    if (this.paused) {
      return;
    }

    log.info('Running tests...');

    this.reporter.onStart('testem', { launcherId: 0 });

    try {
      await this.runHook('before_tests', undefined, async () => {
        await RunTimeout.with(this.config.get('timeout'), (timeout) => {
          this.testSuiteTimeout = timeout;

          timeout.on('timeout', () => {
            let timeoutSeconds = timeout.timeout;

            log.info(
              `Test suite execution has timed out (config.timeout = ${timeoutSeconds} seconds). Terminating all test runners`,
            );
            this.testSuiteTimedOut = true;
            this.killRunners();
          });
          this.timeoutID = timeout.timeoutID; // TODO Remove, just for the tests
          this.currentRun = this.singleRun(timeout);
          this.emit('testRun');

          log.info('Tests running.');

          return this.currentRun;
        });

        await this.runHook('after_tests');
      });
    } catch (err) {
      if (err.hideFromReporter) {
        return;
      }

      let result = {
        failed: 1,
        passed: 0,
        name: 'testem',
        launcherId: 0,
        error: {
          message: err.toString(),
        },
      };

      this.reporter.report('testem', result);
    } finally {
      this.reporter.onEnd('testem', { launcherId: 0 });
    }
  }

  exit(err, cb) {
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
  }

  startServer() {
    log.info('Starting server');
    this.server = new Server(this.config);
    this.server.on('file-requested', this.onFileRequested.bind(this));
    this.server.on('browser-login', this.onBrowserLogin.bind(this));
    this.server.on('browser-relogin', this.onBrowserRelogin.bind(this));
    this.server.on('server-error', this.onServerError.bind(this));

    return this.server.start();
  }

  /**
   * When the server requests a file, add it to the file watcher if it is not already being watched.
   * If the file watcher is disabled, do nothing.
   *
   * @param {string} filepath
   * @returns {Promise<void>}
   */
  async onFileRequested(filepath) {
    if (this.fileWatcher && !this.config.get('serve_files')) {
      try {
        await this.fileWatcher.add(filepath);
      } catch (err) {
        log.error(err);
      }
    }
  }

  onServerError(err) {
    this.exit(err);
  }

  runHook(hook, data, fn) {
    return HookRunner.with(this.config, hook, data, fn);
  }

  onBrowserLogin(browserName, id, socket) {
    let browser = _.find(this.runners, (runner) => {
      return (
        runner.launcherId === id && (!runner.socket || !runner.socket.connected)
      );
    });

    if (!browser) {
      let launcher = new LauncherFactory(
        browserName,
        {
          id: id,
          protocol: 'browser',
        },
        this.config,
      ).create();
      const singleRun = this.config.get('single_run');

      browser = new BrowserTestRunner(
        launcher,
        this.reporter,
        this.runnerIndex++,
        singleRun,
        this.config,
      );
      this.addRunner(browser);
    }

    browser.tryAttach(browserName, id, socket);
  }

  onBrowserRelogin(browserName, id, socket) {
    let browser = _.find(this.runners, (runner) => {
      // a browser relogin can happen if a client socket was disconnected, which may not be reflected in runner.socket's connected state
      // or if the socket was nulled by 'onDisconnect'
      return (
        runner.launcherId === id && (runner.socket || runner.socket === null)
      );
    });

    if (!browser) {
      log.warn(`Relogin from an unknown browser ${browserName} with id ${id}`);
      return;
    }

    if (browser.socket !== null) {
      browser.clearTimeouts();
    } else {
      browser.tryAttach(browserName, id, socket);
    }
  }

  addRunner(runner) {
    this.runners.push(runner);
    this.emit('runnerAdded', runner);
  }

  async configureFileWatch() {
    if (this.config.get('disable_watching')) {
      return;
    }

    this.fileWatcher = await FileWatcher.create(this.config);
    this.fileWatcher.on('fileChanged', (filepath) => {
      log.info(
        filepath +
          ' changed (' +
          (this.disableFileWatch ? 'disabled' : 'enabled') +
          ').',
      );
      if (this.disableFileWatch || this.paused) {
        return;
      }
      let configFile = this.config.get('file');
      if (
        (configFile && filepath === Path.resolve(configFile)) ||
        (this.config.isCwdMode() && filepath === process.cwd())
      ) {
        // config changed
        this.configure(() => {
          this.triggerRun('Config changed');
        });
      } else {
        this.runHook('on_change', { file: filepath }, () => {
          this.triggerRun('File changed: ' + filepath);
        });
      }
    });
    this.fileWatcher.on('EMFILE', () => {
      let view = this.view;
      let text = [
        'The file watcher received a EMFILE system error, which means that ',
        'it has hit the maximum number of files that can be open at a time. ',
        'Luckily, you can increase this limit as a workaround. See the directions below \n \n',
        'Linux: http://stackoverflow.com/a/34645/5304\n',
        'Mac OS: http://serverfault.com/a/15575/47234',
      ].join('');
      view.setErrorPopupMessage(
        new StyledString(text + '\n ').foreground('megenta'),
      );
    });
  }

  async closeFileWatch() {
    if (this.fileWatcher) {
      const w = this.fileWatcher;
      this.fileWatcher = undefined;
      await w.close();
    }
  }

  async createRunners() {
    let reporter = this.reporter;
    let launchers = await promisify(this.config.getLaunchers.bind(this.config))();

    let testPages = this.config.get('test_page');
    launchers.forEach((launcher) => {
      for (let i = 0; i < testPages.length; i++) {
        let launcherInstance = launcher.create({ test_page: testPages[i] });
        let runner = this.createTestRunner(launcherInstance, reporter);
        this.addRunner(runner);
      }
    });
  }

  getRunnerFactory(launcher) {
    let protocol = launcher.protocol();
    switch (protocol) {
      case 'process':
        return ProcessTestRunner;
      case 'browser':
        return BrowserTestRunner;
      case 'tap':
        return TapProcessTestRunner;
      default:
        throw new Error('Unknown protocol: ' + protocol);
    }
  }

  createTestRunner(launcher, reporter) {
    let singleRun = this.config.get('single_run');

    return new (this.getRunnerFactory(launcher))(
      launcher,
      reporter,
      this.runnerIndex++,
      singleRun,
      this.config,
    );
  }

  singleRun(timeout) {
    let limit = this.config.get('parallel');
    let concurrency = limit && limit >= 1 ? parseInt(limit) : Infinity;

    return mapLimit(this.runners, concurrency, async (runner) => {
      if (this.exited) {
        let e = new Error('Run canceled.');
        e.hideFromReporter = true;
        throw e;
      }
      if (this.restarting) {
        return;
      }
      return timeout.try(() => runner.start());
    });
  }

  wrapUp(err) {
    this.exit(err);
  }

  stopServer() {
    if (!this.server) {
      return Promise.resolve();
    }

    return this.server.stop();
  }

  getExitCode() {
    if (!this.reporter) {
      return new Error('Failed to initialize.');
    }
    if (!this.reporter.hasPassed()) {
      let e = new Error('Not all tests passed.');
      e.hideFromReporter = true;
      return e;
    }
    if (!this.reporter.hasTests() && this.config.get('fail_on_zero_tests')) {
      return new Error('No tests found.');
    }
    return null;
  }

  stopRunners() {
    return Promise.all(
      this.runners.map((runner) => {
        if (typeof runner.stop === 'function') {
          return runner.stop();
        }

        return runner.exit();
      }),
    );
  }

  killRunners() {
    return Promise.all(this.runners.map((runner) => runner.exit()));
  }

  launchers() {
    return this.runners.map((runner) => runner.launcher);
  }
};
