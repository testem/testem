const expect = require('chai').expect;
const sinon = require('sinon');
const Backbone = require('backbone');

const screen = require('./fake_screen');
const Config = require('../../lib/config');
const isWin = require('../../lib/utils/is-win')();
const toastNotifyPath = require.resolve('../../lib/reporters/dev/toast_notify');
const runnertabs = require('../../lib/reporters/dev/runner_tabs');
const RunnerTab = runnertabs.RunnerTab;

describe('RunnerTab growl / native notifications', !isWin ? function () {
  let sandbox;
  let notifyStub;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    const toastNotify = require(toastNotifyPath);
    notifyStub = sandbox.stub(toastNotify, 'notify');
  });

  afterEach(function () {
    sandbox.restore();
  });

  function buildTab(progOptions, runnerAttrs) {
    screen.$setSize(20, 8);
    const runner = new Backbone.Model(
      Object.assign(
        {
          name: 'Bob',
          messages: new Backbone.Collection(),
        },
        runnerAttrs || {},
      ),
    );
    runner.hasMessages = function () {
      return false;
    };
    const appview = new Backbone.Model({ currentTab: 0 });
    appview.app = { config: new Config(null, progOptions || {}) };
    appview.isPopupVisible = function () {
      return false;
    };
    const tab = new RunnerTab({
      runner,
      appview,
      selected: true,
      index: 0,
      screen,
    });
    return { runner, tab };
  }

  it('does not notify when growl is disabled', function () {
    const { runner } = buildTab({});
    runner.trigger('tests-end');
    expect(notifyStub).not.to.have.been.called();
  });

  it('notifies with results summary when growl is enabled', function () {
    const results = new Backbone.Model();
    const { runner } = buildTab({ growl: true }, { results });
    results.set({ passed: 3, total: 5 });
    runner.trigger('tests-end');
    expect(notifyStub).to.have.been.calledOnce();
    expect(notifyStub).to.have.been.calledWith({
      title: "Test'em",
      message: 'Bob : 3/5',
    });
  });

  it('notifies with "finished" when there is no results model', function () {
    const { runner } = buildTab({ growl: true });
    runner.trigger('tests-end');
    expect(notifyStub).to.have.been.calledOnce();
    expect(notifyStub).to.have.been.calledWith({
      title: "Test'em",
      message: 'Bob : finished',
    });
  });
} : function () {
  xit('TODO: Fix and re-enable for windows');
});
