import { expect } from "chai";
import Backbone from "backbone";
import * as runnertabs from "../../lib/reporters/dev/runner_tabs.js";
import Config from "../../lib/config.js";
import Chars from "../../lib/utils/chars.js";

var RunnerTab = runnertabs.RunnerTab;

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

describe('RunnerTab status', function() {
  function statusFor(attrs) {
    var results = new Backbone.Model(Object.assign({
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

  it('shows ran/planned while running when a plan is known', function() {
    expect(statusFor({passed: 1, total: 2, planned: 5})).to.match(/^2\/5 /);
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
