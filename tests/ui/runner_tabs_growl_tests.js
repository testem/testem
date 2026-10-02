import { expect } from "chai";
import sinon from "sinon";
import Backbone from "backbone";
import Config from "../../lib/config.js";
import * as runnertabs from "../../lib/reporters/dev/runner_tabs.js";
import toastNotify from "../../lib/reporters/dev/toast_notify.js";

const RunnerTab = runnertabs.RunnerTab;

describe('RunnerTab growl / native notifications', function () {
  let sandbox;
  let notifyStub;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    notifyStub = sandbox.stub(toastNotify, 'notify');
  });

  afterEach(function () {
    sandbox.restore();
  });

  function buildTab(progOptions, runnerAttrs) {
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
      index: 0
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
});
