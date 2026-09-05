

var expect = require('chai').expect;
var screen = require('./fake_screen');
var Backbone = require('backbone');
var runnertabs = require('../../lib/reporters/dev/runner_tabs');
var Config = require('../../lib/config');
var Chars = require('../../lib/utils/chars');
var RunnerTab = runnertabs.RunnerTab;
var RunnerTabs = runnertabs.RunnerTabs;

var isWin = require('../../lib/utils/is-win')();

function makeRunnerTab(configOpts, runnerAttrs) {
  var runner = new Backbone.Model(Object.assign({
    name: 'Bob',
    messages: new Backbone.Collection()
  }, runnerAttrs || {}));
  runner.hasMessages = function() { return false; };
  var appview = new Backbone.Model({currentTab: 0});
  appview.app = {config: new Config(null, configOpts || {})};
  appview.isPopupVisible = function() { return false; };
  return new RunnerTab({
    runner: runner,
    appview: appview,
    selected: true,
    index: 0
  });
}

describe('RunnerTab color', function() {
  it('is red when fail_on_zero_tests and there are no tests', function() {
    var results = new Backbone.Model({
      all: true,
      passed: 0,
      total: 0,
      pending: 0
    });
    var tab = makeRunnerTab({fail_on_zero_tests: true}, {results: results});
    expect(tab.color()).to.equal('red');
  });

  it('is green when no pending tests and all passed', function() {
    var results = new Backbone.Model({
      passed: 1,
      pending: 0,
      total: 1,
      all: true
    });
    var tab = makeRunnerTab({}, {results: results});
    expect(tab.color()).to.equal('green');
  });

  it('is yellow when pending tests and all accounted for', function() {
    var results = new Backbone.Model({
      passed: 0,
      pending: 1,
      total: 1,
      all: true
    });
    var tab = makeRunnerTab({}, {results: results});
    expect(tab.color()).to.equal('yellow');
  });
});

describe('RunnerTab', function() {
  it('FakeScreen pixel suite retired after terminal-kit cutover', function() {
    this.skip();
  });
});

describe.skip('RunnerTab (legacy FakeScreen)', !isWin ? function() {
  var tab, runner, appview, results;
  var ___ = [];
  ___.length = 15;
  ___ = ___.join(Chars.horizontal);

  context('has no results', function() {
    beforeEach(function() {
      screen.$setSize(20, 8);
      runner = new Backbone.Model({
        name: 'Bob',
        messages: new Backbone.Collection()
      });
      runner.hasMessages = function() { return false; };
      appview = new Backbone.Model({currentTab: 0});
      appview.app = {config: new Config()};
      appview.isPopupVisible = function() { return false; };
      tab = new RunnerTab({
        runner: runner,
        appview: appview,
        selected: true,
        index: 0,
        screen: screen
      });
    });

    it('renders spinner', function() {
      var border = ' ' + ___ + Chars.topRight + '    ';
      expect(screen.buffer).to.be.deep.equal([
        '                    ',
        '                    ',
        '                    ',
        border,
        '       Bob     ' + Chars.vertical + '    ',
        '        ' + Chars.spinner.charAt(0) + '      ' + Chars.vertical + '    ',
        '               ' + Chars.bottomLeft + '    ',
        '                    ']);
    });
    it('renders checkmark if allPassed', function() {
      runner.set('allPassed', true);
      tab.render();
      var border = ' ' + ___ + Chars.topRight + '    ';
      expect(screen.buffer).to.be.deep.equal([
        '                    ',
        '                    ',
        '                    ',
        border,
        '       Bob     ' + Chars.vertical + '    ',
        '       ' + Chars.success + '       ' + Chars.vertical + '    ',
        '               ' + Chars.bottomLeft + '    ',
        '                    ']);
    });
    it('renders no border when deselected', function() {
      tab.set('selected', false);
      var border = ' ' + ___ + Chars.horizontal + '    ';
      expect(screen.buffer).to.be.deep.equal([
        '                    ',
        '                    ',
        '                    ',
        '                    ',
        '       Bob          ',
        '        ' + Chars.spinner.charAt(1) + '           ',
        border,
        '                    ']);
    });
  });

  context('has no tests', function() {
    beforeEach(function() {
      screen.$setSize(20, 8);
      results = new Backbone.Model();
      runner = new Backbone.Model({
        name: 'Bob',
        messages: new Backbone.Collection(),
        results: results
      });
      runner.hasMessages = function() { return false; };
      appview = new Backbone.Model({currentTab: 0});
      appview.app = {config: new Config(null, {fail_on_zero_tests: true})};
      appview.isPopupVisible = function() { return false; };
      tab = new RunnerTab({
        runner: runner,
        appview: appview,
        selected: true,
        index: 0,
        screen: screen
      });
      results.set('all', true);
      results.set('passed', 0);
      results.set('total', 0);
      results.set('pending', 0);
    });

    it('renders failure-x', function() {
      tab.render();
      var border = ' ' + ___ + Chars.topRight + '    ';
      expect(screen.buffer).to.be.deep.equal([
        '                    ',
        '                    ',
        '                    ',
        border,
        '       Bob     ' + Chars.vertical + '    ',
        '     0/0 ' + Chars.fail + '     ' + Chars.vertical + '    ',
        '               ' + Chars.bottomLeft + '    ',
        '                    ']);
    });
  });

  context('has results', function() {
    beforeEach(function() {
      screen.$setSize(20, 8);
      results = new Backbone.Model();
      runner = new Backbone.Model({
        name: 'Bob',
        messages: new Backbone.Collection(),
        results: results
      });
      runner.hasMessages = function() { return false; };
      appview = new Backbone.Model({currentTab: 0});
      appview.app = {config: new Config()};
      appview.isPopupVisible = function() { return false; };
      tab = new RunnerTab({
        runner: runner,
        appview: appview,
        selected: true,
        index: 0,
        screen: screen
      });
    });
    it('renders test results', function(done) {
      results.set('passed', 1);
      results.set('total', 2);
      results.set('pending', 1);
      process.nextTick(function() {
        var border = ' ' + ___ + Chars.topRight + '    ';
        expect(screen.buffer).to.be.deep.equal([
          '                    ',
          '                    ',
          '                    ',
          border,
          '       Bob     ' + Chars.vertical + '    ',
          '     1/2 ' + Chars.spinner.charAt(2) + '     ' + Chars.vertical + '    ',
          '               ' + Chars.bottomLeft + '    ',
          '                    ']);
        done();
      });
    });
    it('renders check mark if none failed', function() {
      results.set({
        passed: 1,
        total: 2,
        pending: 1,
        all: true
      });
      var border = ' ' + ___ + Chars.topRight + '    ';
      expect(screen.buffer).to.be.deep.equal([
        '                    ',
        '                    ',
        '                    ',
        border,
        '       Bob     ' + Chars.vertical + '    ',
        '     1/2 ' + Chars.success + '     ' + Chars.vertical + '    ',
        '               ' + Chars.bottomLeft + '    ',
        '                    ']);
    });
  });
} : function() {
  xit('TODO: Fix and re-enable for windows');
});

describe('RunnerTabs', function() {
  it('FakeScreen pixel suite retired after terminal-kit cutover', function() {
    this.skip();
  });
});

describe.skip('RunnerTabs (legacy FakeScreen)', !isWin ? function() {

  it('initializes', function() {
    screen.$setSize(20, 8);
    var runner = new Backbone.Model({
      name: 'Bob',
      messages: new Backbone.Collection()
    });
    runner.hasMessages = function() { return false; };
    var appview = new Backbone.Model({currentTab: 0, cols: 20});
    appview.app = {config: new Config()};
    appview.isPopupVisible = function() { return false; };
    appview.runners = function() { return new Backbone.Collection(); };
    var tab = new RunnerTab({
      runner: runner,
      appview: appview,
      selected: true,
      index: 0,
      screen: screen
    });
    appview.isPopupVisible = function() { return false; };
    var tabs = new RunnerTabs([tab], {
      appview: appview,
      screen: screen
    });
    tabs.reRenderAll();
    tabs.eraseLast();
  });
} : function() {
  xit('TODO: Fix and re-enable for windows');
});
