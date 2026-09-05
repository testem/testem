const termkit = require('terminal-kit');
const log = require('../../log');
const Backbone = require('backbone');

const View = require('./view');
const tabs = require('./runner_tabs');
const RunnerTab = tabs.RunnerTab;
const RunnerTabs = tabs.RunnerTabs;
const Runner = require('./runner');
const { footerHelp } = require('./footer');
const { actionForKey } = require('./keys');
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
  halfPageDown: true
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
    this.viewRunners = new Backbone.Collection();
    this.x = {};
    this.disabled = false;
    this.grabbedInput = false;
    this.injectedTerm = isTerm(term);

    this._initModels();

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

    this.term = this.injectedTerm ? term : termkit.terminal;
    if (!isFinite(this.term.width) || this.term.width <= 0) {
      this.term.width = 80;
    }
    if (!isFinite(this.term.height) || this.term.height <= 0) {
      this.term.height = 24;
    }

    this.document = this.term.createDocument({
      noInput: true,
      keyBindings: {
        TAB: 'focusNext',
        SHIFT_TAB: 'focusPrevious'
      }
    });

    this.set({
      cols: this.term.width,
      lines: this.term.height
    });

    this._initWidgets();
    this._bindKeys();
    this._bindResize();

    if (!this.injectedTerm) {
      this.term.hideCursor();
      this._scheduleGrabInput();
    }
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

  _scheduleGrabInput() {
    const grab = () => {
      if (this.disabled || this.grabbedInput || !this.term) {
        return;
      }
      this.term.grabInput(true);
      this.grabbedInput = true;
    };
    if (this.app && typeof this.app.once === 'function') {
      this.app.once('testRun', grab);
    }
    this._grabInputTimer = setTimeout(grab, 250);
  },

  _bindKeys() {
    this._onDocumentKey = (name) => {
      const action = actionForKey(name);
      if (!action || !DOCUMENT_ACTIONS[action]) {
        return;
      }
      this._dispatchAction(action);
    };
    this.document.on('key', this._onDocumentKey);
  },

  _dispatchAction(action) {
    const splitPanel = this.currentRunnerTab() && this.currentRunnerTab().splitPanel;
    switch (action) {
      case 'quit':
        log.info('Got keyboard Quit command');
        this.app.exit();
        break;
      case 'run':
        log.info('Got keyboard Start Tests command');
        this.app.triggerRun('Triggered manually by pressing enter');
        break;
      case 'togglePause':
        this.app.paused = !this.app.paused;
        this.renderBottom();
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

    const idx = this.viewRunners.length - 1;
    this.x[runner.launcherId] = viewRunner;

    log.info('runnerAdded', runner.name(), runner.launcherId);

    const tab = new RunnerTab({
      runner: viewRunner,
      index: idx,
      appview: this
    });
    this.runnerTabs.push(tab);
    this.set('atLeastOneRunner', this.viewRunners.length > 0);
  },

  runnerRemoved(runner) {
    log.info('runnerRemoved');
    this.viewRunners.remove(this.x[runner.launcherId]);
    this.set('atLeastOneRunner', this.viewRunners.length > 0);
  },

  _showError(titleText, err) {
    let msg = titleText;
    if (err) {
      msg += '\n' + (err.name || '') + '\n' + (err.message || '');
      log.log('warn', titleText, {
        name: err.name,
        message: err.message
      });
    } else {
      log.log('warn', titleText);
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
    if (this.disabled) {
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
      return;
    }

    runner.report(result);

    if (result.logs) {
      result.logs.forEach(entry => runner.get('messages').push(entry));
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
    this.runnerTabs.forEach(tab => {
      if (tab && tab.stopSpinner) {
        tab.stopSpinner();
      }
    });
    if (this._grabInputTimer) {
      clearTimeout(this._grabInputTimer);
      this._grabInputTimer = null;
    }
    if (this.term && this._onTermResize) {
      this.term.off('resize', this._onTermResize);
      this._onTermResize = null;
    }
    if (this.document) {
      if (this._onDocumentKey) {
        this.document.off('key', this._onDocumentKey);
      }
      this.document.destroy(false, true);
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
