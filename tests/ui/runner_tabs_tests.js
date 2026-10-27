import { expect } from "chai";
import { Collection, Model } from "../../lib/reporters/dev/model.js";
import * as runnertabs from "../../lib/reporters/dev/runner_tabs.js";
import Config from "../../lib/config.js";
import Chars from "../../lib/utils/chars.js";

var RunnerTab = runnertabs.RunnerTab;

function makeRunnerTab(configOpts, runnerAttrs) {
  var runner = new Model(Object.assign({
    name: 'Bob',
    messages: new Collection()
  }, runnerAttrs || {}));
  runner.hasMessages = function() { return false; };
  var appview = new Model({currentTab: 0});
  appview.app = {config: new Config(null, configOpts || {})};
  appview.isPopupVisible = function() { return false; };
  return new RunnerTab({
    runner: runner,
    appview: appview,
    selected: true,
    index: 0
  });
}

describe('RunnerTab status', function() {
  function statusFor(attrs) {
    var results = new Model(Object.assign({
      passed: 0,
      pending: 0,
      total: 0,
      planned: 0,
      all: false
    }, attrs));
    var tab = makeRunnerTab({}, {results: results});
    var content;
    tab.statusLabel = {
      setContent: function(text) { content = text; }
    };
    tab.renderResults();
    tab.stopSpinner();
    return content.replace(/\^[^^]?/g, '').trim();
  }

  it('shows passed/planned while running when a plan is known', function() {
    expect(statusFor({passed: 1, total: 2, planned: 5})).to.match(/^1\/5 /);
  });

  it('shows passed/total while running without a plan', function() {
    expect(statusFor({passed: 1, total: 2})).to.match(/^1\/2 /);
  });

  it('falls back to passed/total when more results arrive than planned', function() {
    expect(statusFor({passed: 6, total: 6, planned: 5})).to.match(/^6\/6 /);
  });

  it('shows passed/total and the result mark when done', function() {
    expect(statusFor({passed: 5, total: 5, planned: 5, all: true})).to.equal('5/5 ' + Chars.success);
  });
});

describe('RunnerTab color', function() {
  it('is red when fail_on_zero_tests and there are no tests', function() {
    var results = new Model({
      all: true,
      passed: 0,
      total: 0,
      pending: 0
    });
    var tab = makeRunnerTab({fail_on_zero_tests: true}, {results: results});
    expect(tab.color()).to.equal('red');
  });

  it('is green when no pending tests and all passed', function() {
    var results = new Model({
      passed: 1,
      pending: 0,
      total: 1,
      all: true
    });
    var tab = makeRunnerTab({}, {results: results});
    expect(tab.color()).to.equal('green');
  });

  it('is yellow when pending tests and all accounted for', function() {
    var results = new Model({
      passed: 0,
      pending: 1,
      total: 1,
      all: true
    });
    var tab = makeRunnerTab({}, {results: results});
    expect(tab.color()).to.equal('yellow');
  });
});

describe('RunnerTabs', function() {
  it('destroys a removed tab and reindexes the rest', function() {
    var appview = new Model({ currentTab: 1 });
    appview.app = { config: new Config(null, {}) };
    appview.isPopupVisible = function() { return false; };
    var tabs = new runnertabs.RunnerTabs(appview);
    var first = makeRunnerTab();
    var second = makeRunnerTab();
    var destroyed = false;
    var originalDestroy = second.destroy.bind(second);
    second.destroy = function() {
      destroyed = true;
      originalDestroy();
    };
    tabs.push(first);
    tabs.push(second);
    first.set({ index: 9, selected: false });
    tabs.remove(second);
    expect(destroyed).to.equal(true);
    expect(tabs.length).to.equal(1);
    expect(appview.get('currentTab')).to.equal(0);
    expect(first.get('index')).to.equal(0);
    expect(first.get('selected')).to.equal(true);
  });
});
