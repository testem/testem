const log = require('../../log');
const Backbone = require('backbone');

const View = require('./view');
const tabs = require('./runner_tabs');
const RunnerTab = tabs.RunnerTab;
const RunnerTabs = tabs.RunnerTabs;
const Runner = require('./runner');
const { footerHelp } = require('./footer');
const { actionForKey, actionForRawByte } = require('./keys');
const { escapeMarkup } = require('./markup');
const { appViewRects, applyRect, tabLabelRects } = require('./layout');

const DOCUMENT_ACTIONS = {
  quit: true,
  run: true,
  togglePause: true,
  nextTab: true,
  prevTab: true,
  pageDown: true,
  pageUp: true,
  halfPageUp: true,
  halfPageDown: true,
  scrollUp: true,
  scrollDown: true,
  toggleFocus: true
};

function isTerm(value) {
  return value && typeof value.createDocument === 'function';
}

module.exports = View.extend({
  defaults: {
    currentTab: 0,
    atLeastOneRunner: false
  },
  initialize(silent, out, config, app, term) {
    this.name = 'Testem';
    this.config = config;
    this.app = app;
    this.out = out && typeof out.write === 'function' ? out : process.stdout;
    this.viewRunners = new Backbone.Collection();
    this.x = {};
    this.disabled = false;
    this.grabbedInput = false;
    this.injectedTerm = isTerm(term);

    this._initModels();
    this.set({
      cols: 80,
      lines: 24
    });

    if (term && !this.injectedTerm) {
      this.disabled = true;
      return;
    }

    if (!this.injectedTerm && !process.stdout.isTTY) {
      this.disabled = true;
      const stream = out && typeof out.write === 'function' ? out : process.stdout;
      stream.write('Not a TTY; use testem ci\n');
      return;
    }

    if (this.injectedTerm) {
      this._startTui(term);
      return;
    }

    // Drawing before the server is listening would replace an EADDRINUSE
    // message with an empty dashboard, so wait for it.
    this._onServerStart = () => this._startTui();
    this.app.once('server-start', this._onServerStart);
  },

  _startTui(term) {
    if (this.document || this.disabled) {
      return;
    }

    const termkit = require('terminal-kit');
    this.termkit = termkit;
    this.term = term || termkit.terminal;
    if (!this.injectedTerm && typeof this.term.clear === 'function') {
      this.term.clear();
    }
    if (!isFinite(this.term.width) || this.term.width <= 0) {
      this.term.width = 80;
    }
    if (!isFinite(this.term.height) || this.term.height <= 0) {
      this.term.height = 24;
    }

    this.document = this.term.createDocument();
    // Document would route keys to the focused TextBox, which swallows
    // characters like q. Testem owns the keymap; panes scroll via our actions.
    if (this.document.onEventSourceKey) {
      this.term.off('key', this.document.onEventSourceKey);
    }

    this.set({
      cols: this.term.width,
      lines: this.term.height
    });

    this._initWidgets();
    this._bindKeys();
    this._bindResize();
    this._bindProcessWarnings();

    this.viewRunners.forEach((viewRunner, idx) => {
      this._addTab(viewRunner, idx);
    });

    if (!this.injectedTerm) {
      this.term.hideCursor();
      this._grabInput();
    }
    this.render();
  },

  /**
   * Widgets update their own buffers with `noDraw`, so the Document still has to
   * be flushed to the terminal. Coalesce it: a run can report hundreds of
   * results, and one blit per result would peg the terminal.
   */
  requestDraw() {
    if (this.disabled || !this.document || this.injectedTerm || this._drawQueued) {
      return;
    }
    this._drawQueued = true;
    this._drawTimer = setTimeout(() => {
      this._drawQueued = false;
      this._drawTimer = null;
      if (!this.disabled && this.document) {
        this.document.draw();
      }
    }, 30);
  },

  _addTab(viewRunner, idx) {
    const tab = new RunnerTab({
      runner: viewRunner,
      index: idx,
      appview: this
    });
    this.runnerTabs.push(tab);
    this.set('atLeastOneRunner', this.viewRunners.length > 0);
  },

  _initModels() {
    this.runnerTabs = new RunnerTabs([], {
      appview: this
    });
    this.set({
      runnerTabs: this.runnerTabs
    });
    this.app.on('runnerAdded', runner => this.runnerAdded(runner));
    this.app.on('runnerRemoved', runner => this.runnerRemoved(runner));
    this.on('change:atLeastOneRunner', () => {
      if (this.get('atLeastOneRunner') && this.get('currentTab') < 0) {
        this.set('currentTab', 0);
      }
      this.render();
    });
    this.on('change:lines change:cols', () => {
      this.render();
    });
  },

  _initWidgets() {
    const termkit = this.termkit;
    const document = this.document;
    const rects = appViewRects(this.get('cols'), this.get('lines'));

    this.headerTitle = new termkit.Text({
      parent: document,
      x: rects.title.x,
      y: rects.title.y,
      width: rects.title.width,
      height: rects.title.height,
      content: "TEST'EM 'SCRIPTS!",
      attr: { color: 'brightWhite' },
      noDraw: true
    });
    this.headerHint = new termkit.Text({
      parent: document,
      x: rects.hint.x,
      y: rects.hint.y,
      width: rects.hint.width,
      height: rects.hint.height,
      content: 'Open the URL below in a browser to connect.',
      noDraw: true
    });
    this.headerUrl = new termkit.Text({
      parent: document,
      x: rects.url.x,
      y: rects.url.y,
      width: rects.url.width,
      height: rects.url.height,
      contentHasMarkup: true,
      noDraw: true
    });
    this.waitingText = new termkit.Text({
      parent: document,
      x: rects.waiting.x,
      y: rects.waiting.y,
      width: rects.waiting.width,
      height: rects.waiting.height,
      content: 'Waiting for runners...',
      noDraw: true
    });
    this.footerText = new termkit.Text({
      parent: document,
      x: rects.footer.x,
      y: rects.footer.y,
      width: rects.footer.width,
      height: rects.footer.height,
      noDraw: true
    });
    this.popupText = new termkit.Text({
      parent: document,
      x: rects.popup.x,
      y: rects.popup.y,
      width: rects.popup.width,
      height: rects.popup.height,
      hidden: true,
      contentHasMarkup: true,
      attr: { color: 'magenta' },
      zIndex: 10,
      noDraw: true
    });
  },

  _bindProcessWarnings() {
    if (this.injectedTerm || this._onProcessWarning) {
      return;
    }
    // A process 'warning' listener suppresses Node's default stderr print,
    // which would otherwise punch through the Document.
    this._onProcessWarning = (warning) => {
      log.warn(warning);
    };
    process.on('warning', this._onProcessWarning);
  },

  _grabInput() {
    if (this.disabled || this.grabbedInput || !this.term) {
      return;
    }
    if (process.stdin && !process.stdin.isTTY) {
      log.warn('stdin is not a TTY; keyboard input will not work');
    }
    this.term.grabInput(true);
    this.grabbedInput = true;
  },

  _bindKeys() {
    this._onTermKey = (name) => {
      const action = actionForKey(name);
      if (!action || !DOCUMENT_ACTIONS[action]) {
        return;
      }
      this._dispatchAction(action);
    };
    this.term.on('key', this._onTermKey);

    if (this.injectedTerm || !process.stdin || typeof process.stdin.on !== 'function') {
      return;
    }
    // Some terminals never deliver a terminal-kit 'key' event for plain
    // characters, which leaves the user with no way out. Read the bytes too;
    // _requestQuit is idempotent, so a doubled quit costs nothing.
    this._onStdinData = (chunk) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      for (let i = 0; i < bytes.length; i++) {
        if (actionForRawByte(bytes[i]) === 'quit') {
          this._requestQuit();
          return;
        }
      }
    };
    process.stdin.on('data', this._onStdinData);
  },

  _requestQuit() {
    const now = Date.now();
    if (this._quitRequested) {
      // Both key paths can see the same press; only a genuinely later press
      // means the user is still waiting and wants out now.
      if (now - this._quitRequestedAt > 500) {
        this._forceExit();
      }
      return;
    }
    this._quitRequested = true;
    this._quitRequestedAt = now;
    log.info('Got keyboard Quit command');

    try {
      this.app.exit();
    } catch (err) {
      log.warn(err);
    }

    if (this.injectedTerm) {
      try {
        this.cleanup();
      } catch (err) {
        log.warn(err);
      }
      return;
    }

    // app.exit() only unwinds the run; a launcher that will not die must not
    // leave the user stuck in a terminal they can no longer type into.
    this._quitFallbackTimer = setTimeout(() => this._forceExit(), 4000);
  },

  /** Restore the terminal by hand, because normal teardown did not get there. */
  _forceExit() {
    if (this._quitFallbackTimer) {
      clearTimeout(this._quitFallbackTimer);
      this._quitFallbackTimer = null;
    }
    if (this.injectedTerm) {
      return;
    }
    try {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
    } catch {
      // already cooked
    }
    try {
      process.stdout.write('\x1b[?25h\x1b[0m\n');
    } catch {
      // best-effort restore
    }
    process.exit(this.app && this.app.exitErr ? 1 : 0);
  },

  _dispatchAction(action) {
    const splitPanel = this.currentRunnerTab() && this.currentRunnerTab().splitPanel;
    switch (action) {
      case 'quit':
        this._requestQuit();
        break;
      case 'run':
        log.info('Got keyboard Start Tests command');
        this.app.triggerRun('Triggered manually by pressing enter');
        break;
      case 'togglePause':
        this.app.paused = !this.app.paused;
        this.renderBottom();
        this.requestDraw();
        break;
      case 'nextTab':
        this.nextTab();
        break;
      case 'prevTab':
        this.prevTab();
        break;
      case 'pageDown':
        if (splitPanel) {
          splitPanel.pageDown();
        }
        break;
      case 'pageUp':
        if (splitPanel) {
          splitPanel.pageUp();
        }
        break;
      case 'halfPageUp':
        if (splitPanel) {
          splitPanel.halfPageUp();
        }
        break;
      case 'halfPageDown':
        if (splitPanel) {
          splitPanel.halfPageDown();
        }
        break;
      case 'scrollUp':
        if (splitPanel) {
          splitPanel.scrollUp();
        }
        break;
      case 'scrollDown':
        if (splitPanel) {
          splitPanel.scrollDown();
        }
        break;
      case 'toggleFocus':
        if (splitPanel) {
          splitPanel.toggleFocus();
        }
        break;
      default:
        break;
    }
  },

  _bindResize() {
    if (!this.document || !this.term) {
      return;
    }
    this.term.off('resize', this.document.onEventSourceResize);
    this._onTermResize = (width, height) => {
      this._onDocumentResize(width, height);
    };
    this.document.onEventSourceResize = this._onTermResize;
    this.term.on('resize', this._onTermResize);
  },

  _onDocumentResize(width, height) {
    if (this.disabled || !this.document || !width || !height) {
      return;
    }
    this.document.resize({
      x: 0,
      y: 0,
      width: width,
      height: height
    });
    this.document.outputWidth = width;
    this.document.outputHeight = height;
    this.set({ cols: width, lines: height }, { silent: true });
    this._layoutWidgets();
    this._layoutTabs();
    this.runnerTabs.forEach((tab) => {
      if (tab.splitPanel) {
        tab.splitPanel.syncDimensions();
      }
    });
    this.document.draw();
  },

  _layoutWidgets() {
    if (this.disabled || !this.document) {
      return;
    }
    const rects = appViewRects(this.get('cols'), this.get('lines'));
    applyRect(this.headerTitle, rects.title);
    applyRect(this.headerHint, rects.hint);
    applyRect(this.headerUrl, rects.url);
    applyRect(this.waitingText, rects.waiting);
    applyRect(this.footerText, rects.footer);
    applyRect(this.popupText, rects.popup);
  },

  _layoutTabs() {
    const cols = this.get('cols');
    const lines = this.get('lines');
    this.runnerTabs.forEach((tab) => {
      const rects = tabLabelRects(tab.get('index'), cols, lines);
      applyRect(tab.nameLabel, rects.name);
      applyRect(tab.statusLabel, rects.status);
    });
  },

  runnerAdded(runner) {
    const viewRunner = new Runner(runner);
    this.viewRunners.push(viewRunner);
    this.x[runner.launcherId] = viewRunner;

    log.info('runnerAdded', runner.name(), runner.launcherId);

    if (this.document) {
      this._addTab(viewRunner, this.viewRunners.length - 1);
    }
  },

  runnerRemoved(runner) {
    log.info('runnerRemoved');
    this.viewRunners.remove(this.x[runner.launcherId]);
    this.set('atLeastOneRunner', this.viewRunners.length > 0);
  },

  _showError(titleText, err) {
    let msg = titleText;
    if (err) {
      const name = err.name || '';
      const message = err.message || String(err);
      msg += '\n' + name + '\n' + message;
      log.warn(titleText, message);
    } else {
      log.warn(titleText);
    }
    this.setErrorPopupMessage(msg);
  },

  runners() {
    return this.viewRunners;
  },
  currentRunnerTab() {
    const idx = this.get('currentTab');
    return this.runnerTabs.at(idx);
  },

  nextTab() {
    if (this.runners().length === 0) {
      return;
    }
    let currentTab = this.get('currentTab');
    currentTab++;
    if (currentTab >= this.runners().length) {
      currentTab = 0;
    }
    this.set('currentTab', currentTab);
  },
  prevTab() {
    if (this.runners().length === 0) {
      return;
    }
    let currentTab = this.get('currentTab');
    currentTab--;
    if (currentTab < 0) {
      currentTab = this.runners().length - 1;
    }
    this.set('currentTab', currentTab);
  },
  setErrorPopupMessage(msg) {
    const text = msg === undefined || msg === null ? '' : msg.toString();
    this.set('isPopupVisible', !!text);
    if (this.popupText) {
      this.popupText.hidden = !text;
      this.popupText.setContent(escapeMarkup(text), true, true);
    }
    this.render();
  },
  clearErrorPopupMessage() {
    this.setErrorPopupMessage('');
  },
  isPopupVisible() {
    return !!this.get('isPopupVisible');
  },

  render() {
    if (this.disabled || !this.document) {
      return;
    }
    this.renderTop();
    this.renderMiddle();
    this.renderBottom();
    if (this.document && !this.injectedTerm) {
      this.document.draw();
    }
  },
  renderTop() {
    if (this.disabled || this.isPopupVisible() || !this.headerTitle) {
      return;
    }
    const url = this.config.get('url') || '';
    this.headerUrl.setContent('^_' + escapeMarkup(url) + '^', true, true);
  },
  renderMiddle() {
    if (this.disabled || !this.waitingText) {
      return;
    }
    this.waitingText.hidden = this.isPopupVisible() || this.viewRunners.length > 0;
  },
  renderBottom() {
    if (this.disabled || this.isPopupVisible() || !this.footerText) {
      return;
    }
    const msg = footerHelp({
      hasRunners: this.get('atLeastOneRunner'),
      paused: this.app.paused
    });
    this.footerText.setContent(msg, false, true);
  },

  report(browserName, result) {
    if (isTestemItself(result)) {
      return this._showError('Testem error', result.error);
    }

    const runner = this.x[result.launcherId];
    if (!runner) {
      // Startup failures (a port already in use, say) are reported before any
      // runner exists. With no Document there is no popup to show them in, so
      // they would otherwise vanish and testem would look like it just quit.
      if (!this.document && result && result.error) {
        this._writeStartupError(result);
      }
      return;
    }

    runner.report(result);

    if (result.logs) {
      result.logs.forEach(entry => runner.get('messages').push(entry));
    }
  },

  _writeStartupError(result) {
    const message = (result.error && result.error.message) || String(result.error);
    const name = result.name && result.name !== 'unknown error' ? result.name + ': ' : '';
    try {
      this.out.write(name + message + '\n');
    } catch {
      // nothing more we can do this late
    }
  },

  onStart(browserName, opts) {
    if (isTestemItself(opts)) {
      return this.clearErrorPopupMessage();
    }

    const runner = this.x[opts.launcherId];
    if (!runner) {
      return;
    }

    log.info(browserName, 'onStart');
    runner.onStart();
  },

  onEnd(browserName, opts) {
    if (isTestemItself(opts)) {
      return;
    }

    const runner = this.x[opts.launcherId];
    if (!runner) {
      return;
    }

    log.info(browserName, 'onEnd');
    runner.onEnd();
  },

  finish() {
    this.cleanup();
  },

  cleanup(cb) {
    this.disabled = true;
    if (this._onServerStart && this.app) {
      this.app.off('server-start', this._onServerStart);
      this._onServerStart = null;
    }
    if (this._quitFallbackTimer) {
      clearTimeout(this._quitFallbackTimer);
      this._quitFallbackTimer = null;
    }
    if (this._drawTimer) {
      clearTimeout(this._drawTimer);
      this._drawTimer = null;
      this._drawQueued = false;
    }
    if (this._onStdinData && process.stdin) {
      process.stdin.off('data', this._onStdinData);
      this._onStdinData = null;
    }
    this.runnerTabs.forEach(tab => {
      if (tab && tab.stopSpinner) {
        tab.stopSpinner();
      }
    });
    if (this._onProcessWarning) {
      process.off('warning', this._onProcessWarning);
      this._onProcessWarning = null;
    }
    if (this.term && this._onTermKey) {
      this.term.off('key', this._onTermKey);
      this._onTermKey = null;
    }
    if (this.term && this._onTermResize) {
      this.term.off('resize', this._onTermResize);
      this._onTermResize = null;
    }
    if (this.document) {
      // destroy() can hang on a live TTY after grabInput. Tests still need it
      // so the injected Document does not leak listeners.
      if (this.injectedTerm) {
        this.document.destroy(false, true);
      }
      this.document = null;
    }
    if (this.grabbedInput && this.term) {
      this.term.grabInput(false);
      this.grabbedInput = false;
    }
    if (this.term && !this.injectedTerm) {
      try {
        this.term.styleReset();
        this.term.hideCursor(false);
      } catch {
        // ignore restore failures on teardown
      }
    }
    if (cb) {
      cb();
    }
  }
});

function isTestemItself(opts) {
  return opts.launcherId === 0;
}
