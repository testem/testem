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
    appview.runnerAdded({
      name: function () { return 'Chrome'; },
      launcherId: 1
    });
    const panel = appview.currentRunnerTab().splitPanel;
    expect(panel.get('focus')).to.equal('top');
    term.emit('key', 'TAB');
    expect(panel.get('focus')).to.equal('bottom');
    term.emit('key', 'TAB');
    expect(panel.get('focus')).to.equal('top');
  });
});
