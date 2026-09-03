const fs = require('fs');
const path = require('path');
const vm = require('vm');
const expect = require('chai').expect;
const sinon = require('sinon');

const adapterSource = fs.readFileSync(
  path.join(__dirname, '../public/testem/qunit_adapter.js'),
  'utf8'
);

function loadAdapter() {
  const emit = sinon.spy();
  const hooks = {};
  const context = {
    emit,
    QUnit: {
      log: function(cb) { hooks.log = cb; },
      testStart: function(cb) { hooks.testStart = cb; },
      testDone: function(cb) { hooks.testDone = cb; },
      done: function(cb) { hooks.done = cb; }
    }
  };

  vm.createContext(context);
  vm.runInContext(adapterSource, context, {
    filename: 'qunit_adapter.js'
  });

  return { emit, hooks, context };
}

describe('qunitAdapter', function() {
  it('registers QUnit hooks', function() {
    const { hooks, context } = loadAdapter();

    context.qunitAdapter();

    expect(hooks.log).to.be.a('function');
    expect(hooks.testStart).to.be.a('function');
    expect(hooks.testDone).to.be.a('function');
    expect(hooks.done).to.be.a('function');
  });

  it('emits tests-start and test-result for a completed test', function() {
    const { emit, hooks, context } = loadAdapter();

    context.qunitAdapter();
    hooks.testStart({ module: 'module', name: 'example' });
    hooks.testDone({
      failed: 0,
      passed: 1,
      skipped: 0,
      todo: 0,
      total: 1,
      runtime: 1,
      testId: 1
    });

    expect(emit).to.have.been.calledWith('tests-start', sinon.match({
      name: 'module: example'
    }));
    expect(emit).to.have.been.calledWith('test-result', sinon.match({
      name: 'module: example',
      passed: 1,
      failed: 0,
      total: 1
    }));
  });

  it('emits all-test-results when QUnit finishes', function() {
    const { emit, hooks, context } = loadAdapter();

    context.qunitAdapter();
    hooks.done({ runtime: 10 });

    expect(emit).to.have.been.calledWith('all-test-results');
  });
});
