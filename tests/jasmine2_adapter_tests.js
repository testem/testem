const fs = require('fs');
const path = require('path');
const vm = require('vm');
const expect = require('chai').expect;
const sinon = require('sinon');

const adapterSource = fs.readFileSync(
  path.join(__dirname, '../public/testem/jasmine2_adapter.js'),
  'utf8'
);

function loadAdapter() {
  const addReporter = sinon.spy();
  const emit = sinon.spy();
  const context = {
    emit,
    jasmine: {
      getEnv: function() {
        return { addReporter };
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(adapterSource, context, {
    filename: 'jasmine2_adapter.js'
  });

  return { addReporter, emit, context };
}

describe('jasmine2Adapter', function() {
  it('registers a Jasmine reporter', function() {
    const { addReporter, context } = loadAdapter();

    context.jasmine2Adapter();

    expect(addReporter).to.have.been.calledOnce();
    const reporter = addReporter.firstCall.args[0];
    expect(reporter).to.respondTo('jasmineStarted');
    expect(reporter).to.respondTo('specStarted');
    expect(reporter).to.respondTo('specDone');
    expect(reporter).to.respondTo('jasmineDone');
  });

  it('emits tests-start when Jasmine starts', function() {
    const { addReporter, emit, context } = loadAdapter();

    context.jasmine2Adapter();
    const reporter = addReporter.firstCall.args[0];
    reporter.jasmineStarted();

    expect(emit).to.have.been.calledWith('tests-start');
  });

  it('emits test-result for a passing spec', function() {
    const { addReporter, emit, context } = loadAdapter();

    context.jasmine2Adapter();
    const reporter = addReporter.firstCall.args[0];
    reporter.specDone({
      id: 0,
      fullName: 'example spec',
      status: 'passed',
      failedExpectations: []
    });

    expect(emit).to.have.been.calledWith('test-result', sinon.match({
      name: 'example spec',
      passed: 1,
      failed: 0,
      total: 1
    }));
  });

  it('emits all-test-results when Jasmine finishes', function() {
    const { addReporter, emit, context } = loadAdapter();

    context.jasmine2Adapter();
    const reporter = addReporter.firstCall.args[0];
    reporter.jasmineDone();

    expect(emit).to.have.been.calledWith('all-test-results');
  });
});
