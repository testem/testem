const expect = require('chai').expect;
const Backbone = require('backbone');

const AppView = require('../../lib/reporters/dev');
const Config = require('../../lib/config');
const { createTestTerm } = require('./create_test_term');

describe('AppView terminal-kit', function () {
  let app;
  let config;
  let appview;

  beforeEach(function () {
    app = new Backbone.Model();
    app.paused = false;
    app.exit = function () {};
    app.triggerRun = function () {};
    app.on = app.on.bind(app);
    config = app.config = new Config({}, { port: 1234 });
    app.runners = new Backbone.Collection();
  });

  afterEach(function () {
    if (appview) {
      appview.cleanup();
      appview = null;
    }
  });

  it('stays headless when the fifth argument is not a terminal', function () {
    appview = new AppView(false, process.stdout, config, app, {});
    expect(appview.disabled).to.equal(true);
    expect(appview.document).to.equal(undefined);
  });

  it('creates a Document when given createTerminal', function () {
    const { term } = createTestTerm();
    appview = new AppView(false, process.stdout, config, app, term);
    expect(appview.disabled).to.equal(false);
    expect(appview.document).to.exist();
    expect(appview.grabbedInput).to.equal(false);
    appview.setErrorPopupMessage('EMFILE');
    expect(appview.isPopupVisible()).to.equal(true);
    appview.clearErrorPopupMessage();
    expect(appview.isPopupVisible()).to.equal(false);
  });

  it('shows a Testem error popup without throwing', function () {
    const { term } = createTestTerm();
    appview = new AppView(false, process.stdout, config, app, term);
    expect(function () {
      appview.report('testem', {
        launcherId: 0,
        error: { name: 'Error', message: 'boom' }
      });
    }).not.to.throw();
    expect(appview.isPopupVisible()).to.equal(true);
  });

  it('can draw on a 157x38 ScreenBuffer without overflowing', function () {
    const { term } = createTestTerm(157, 38);
    appview = new AppView(false, process.stdout, config, app, term);
    expect(function () {
      appview.document.draw();
    }).not.to.throw();
  });

  it('can add runner tabs and draw without overflowing', function () {
    const { term } = createTestTerm(157, 38);
    appview = new AppView(false, process.stdout, config, app, term);
    appview.injectedTerm = false;
    expect(function () {
      appview.runnerAdded({
        name: function () { return 'Chrome'; },
        launcherId: 1
      });
      appview.runnerAdded({
        name: function () { return 'Mocha'; },
        launcherId: 2
      });
      appview.document.draw();
    }).not.to.throw();
    expect(appview.runners().length).to.equal(2);
  });

  it('relays a terminal shrink without overflowing the ScreenBuffer', function () {
    const { term } = createTestTerm(157, 38);
    appview = new AppView(false, process.stdout, config, app, term);
    appview.runnerAdded({
      name: function () { return 'Chrome'; },
      launcherId: 1
    });
    expect(function () {
      term.width = 157;
      term.height = 36;
      term.emit('resize', 157, 36);
    }).not.to.throw();
    expect(appview.get('lines')).to.equal(36);
    expect(appview.footerText.outputY).to.equal(35);
  });

  it('relays a terminal grow without overflowing the ScreenBuffer', function () {
    const { term } = createTestTerm(80, 24);
    appview = new AppView(false, process.stdout, config, app, term);
    expect(function () {
      term.width = 157;
      term.height = 38;
      term.emit('resize', 157, 38);
    }).not.to.throw();
    expect(appview.get('cols')).to.equal(157);
    expect(appview.footerText.outputY).to.equal(37);
  });

  it('prints a one-line hint when stdout is not a TTY', function () {
    const descriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
    const writes = [];
    const out = {
      write(chunk) {
        writes.push(String(chunk));
      }
    };
    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      enumerable: true,
      value: false
    });
    try {
      appview = new AppView(false, out, config, app);
      expect(appview.disabled).to.equal(true);
      expect(appview.document).to.equal(undefined);
      expect(writes.join('')).to.equal('Not a TTY; use testem ci\n');
    } finally {
      if (descriptor) {
        Object.defineProperty(process.stdout, 'isTTY', descriptor);
      } else {
        delete process.stdout.isTTY;
      }
    }
  });

  it('mounts runners that were added before the Document existed', function () {
    appview = new AppView(false, process.stdout, config, app, {});
    appview.disabled = false;
    appview.injectedTerm = true;
    appview.runnerAdded({
      name: function () { return 'Chrome'; },
      launcherId: 1
    });
    expect(appview.document).to.equal(undefined);
    expect(appview.runnerTabs.length).to.equal(0);
    const { term } = createTestTerm(157, 38);
    appview._startTui(term);
    expect(appview.document).to.exist();
    expect(appview.runnerTabs.length).to.equal(1);
    expect(function () {
      appview.document.draw();
    }).not.to.throw();
  });

  it('quits when q is pressed', function () {
    const { term } = createTestTerm();
    let exits = 0;
    app.exit = function () {
      exits++;
    };
    appview = new AppView(false, process.stdout, config, app, term);
    term.emit('key', 'q');
    expect(exits).to.equal(1);
    expect(appview.disabled).to.equal(true);
  });

  it('quits when Q is pressed', function () {
    const { term } = createTestTerm();
    let exits = 0;
    app.exit = function () {
      exits++;
    };
    appview = new AppView(false, process.stdout, config, app, term);
    term.emit('key', 'Q');
    expect(exits).to.equal(1);
  });

  it('quits once when CTRL_C is pressed twice', function () {
    const { term } = createTestTerm();
    let exits = 0;
    app.exit = function () {
      exits++;
    };
    appview = new AppView(false, process.stdout, config, app, term);
    term.emit('key', 'CTRL_C');
    term.emit('key', 'CTRL_C');
    expect(exits).to.equal(1);
  });

  it('runs tests when ENTER is pressed', function () {
    const { term } = createTestTerm();
    const runs = [];
    app.triggerRun = function (src) {
      runs.push(src);
    };
    appview = new AppView(false, process.stdout, config, app, term);
    term.emit('key', 'ENTER');
    expect(runs).to.deep.equal(['Triggered manually by pressing enter']);
  });

  it('repaints the footer when p toggles pause', function () {
    const { term } = createTestTerm();
    appview = new AppView(false, process.stdout, config, app, term);
    const footer = () => [].concat(appview.footerText.content).join('');
    expect(footer()).to.contain('p to pause');
    let draws = 0;
    appview.requestDraw = function () {
      draws++;
    };
    term.emit('key', 'p');
    expect(app.paused).to.equal(true);
    expect(footer()).to.contain('PAUSED');
    expect(draws).to.equal(1);
  });

  it('toggles split-pane focus when TAB is pressed', function () {
    const { term } = createTestTerm();
    appview = new AppView(false, process.stdout, config, app, term);
    addRunner(appview, 'Chrome', 1);
    const panel = appview.currentRunnerTab().splitPanel;
    expect(panel.get('focus')).to.equal('top');
    term.emit('key', 'TAB');
    expect(panel.get('focus')).to.equal('bottom');
    term.emit('key', 'TAB');
    expect(panel.get('focus')).to.equal('top');
  });

  it('cycles tabs with RIGHT and LEFT and wraps', function () {
    const { term } = createTestTerm();
    appview = new AppView(false, process.stdout, config, app, term);
    addRunner(appview, 'Chrome', 1);
    addRunner(appview, 'Mocha', 2);
    expect(appview.get('currentTab')).to.equal(0);
    term.emit('key', 'RIGHT');
    expect(appview.get('currentTab')).to.equal(1);
    term.emit('key', 'RIGHT');
    expect(appview.get('currentTab')).to.equal(0);
    term.emit('key', 'LEFT');
    expect(appview.get('currentTab')).to.equal(1);
    term.emit('key', 'LEFT');
    expect(appview.get('currentTab')).to.equal(0);
  });

  it('ignores LEFT and RIGHT when there are no runners', function () {
    const { term } = createTestTerm();
    appview = new AppView(false, process.stdout, config, app, term);
    expect(appview.get('currentTab')).to.equal(0);
    expect(function () {
      term.emit('key', 'LEFT');
      term.emit('key', 'RIGHT');
    }).not.to.throw();
    expect(appview.get('currentTab')).to.equal(0);
  });

  it('scrolls and pages the focused split pane from the key map', function () {
    const { term } = createTestTerm();
    appview = new AppView(false, process.stdout, config, app, term);
    addRunner(appview, 'Chrome', 1);
    const panel = appview.currentRunnerTab().splitPanel;
    const calls = [];
    ['scrollUp', 'scrollDown', 'pageDown', 'pageUp', 'halfPageUp', 'halfPageDown'].forEach(function (method) {
      panel[method] = function () {
        calls.push(method);
      };
    });
    term.emit('key', 'UP');
    term.emit('key', 'DOWN');
    term.emit('key', ' ');
    term.emit('key', 'b');
    term.emit('key', 'u');
    term.emit('key', 'd');
    expect(calls).to.deep.equal([
      'scrollUp',
      'scrollDown',
      'pageDown',
      'pageUp',
      'halfPageUp',
      'halfPageDown'
    ]);
  });

  it('hides the split pane while the error popup is visible and restores the footer', function () {
    const { term } = createTestTerm();
    appview = new AppView(false, process.stdout, config, app, term);
    addRunner(appview, 'Chrome', 1);
    const panel = appview.currentRunnerTab().splitPanel;
    expect(panel.get('visible')).to.equal(true);
    appview.setErrorPopupMessage('EMFILE');
    expect(appview.popupText.hidden).to.equal(false);
    expect(panel.get('visible')).to.equal(false);
    expect(widgetText(appview.popupText)).to.contain('EMFILE');
    appview.clearErrorPopupMessage();
    expect(appview.isPopupVisible()).to.equal(false);
    expect(appview.popupText.hidden).to.equal(true);
    expect(panel.get('visible')).to.equal(true);
    expect(widgetText(appview.footerText)).to.contain('q to quit');
  });

  it('finishes and cleans up an injected Document without throwing', function () {
    const { term } = createTestTerm();
    appview = new AppView(false, process.stdout, config, app, term);
    expect(term.listenerCount('key')).to.be.above(0);
    expect(function () {
      appview.finish();
    }).not.to.throw();
    expect(appview.document).to.equal(null);
    expect(appview.grabbedInput).to.equal(false);
    expect(appview._onTermKey).to.equal(null);
  });

  it('cleans up when there is no Document or TTY', function () {
    const out = { write: function () {} };
    appview = new AppView(false, out, config, app, {});
    expect(appview.disabled).to.equal(true);
    expect(appview.document).to.equal(undefined);
    expect(function () {
      appview.cleanup();
      appview.finish();
    }).not.to.throw();
  });

  it('quits when raw stdin delivers a quit byte', function () {
    const { term } = createTestTerm();
    let exits = 0;
    app.exit = function () {
      exits++;
    };
    appview = new AppView(false, process.stdout, config, app, {});
    appview.disabled = false;
    appview.term = term;
    appview.injectedTerm = false;
    appview._bindKeys();
    expect(appview._onStdinData).to.be.a('function');
    // Keep injectedTerm true so _requestQuit does not arm _forceExit.
    appview.injectedTerm = true;
    process.stdin.emit('data', Buffer.from([0x71]));
    expect(exits).to.equal(1);
    process.stdin.emit('data', Buffer.from([0x03]));
    expect(exits).to.equal(1);
    appview.cleanup();
    process.stdin.emit('data', Buffer.from([0x71]));
    expect(exits).to.equal(1);
  });

  it('writes a startup error when no Document exists yet', function () {
    const writes = [];
    const out = {
      write: function (chunk) {
        writes.push(String(chunk));
      }
    };
    appview = new AppView(false, out, config, app, {});
    appview.report('Chrome', {
      launcherId: 7,
      name: 'Chrome',
      error: { message: 'listen EADDRINUSE: address already in use :::7400' }
    });
    expect(writes.join('')).to.equal(
      'Chrome: listen EADDRINUSE: address already in use :::7400\n'
    );
  });
});

function addRunner(appview, name, launcherId) {
  appview.runnerAdded({
    name: function () { return name; },
    launcherId: launcherId
  });
}

function widgetText(widget) {
  return [].concat(widget.content).join('');
}
