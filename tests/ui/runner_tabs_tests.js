
var expect = require('chai').expect;
var Backbone = require('backbone');
var runnertabs = require('../../lib/reporters/dev/runner_tabs');
var Config = require('../../lib/config');
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
