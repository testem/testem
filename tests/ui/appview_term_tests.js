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

  it('can draw on a 157x38 ScreenBuffer without overflowing', function () {
    const { term } = createTestTerm(157, 38);
    appview = new AppView(false, process.stdout, config, app, term);
    expect(function () {
      appview.document.draw();
    }).not.to.throw();
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
});
