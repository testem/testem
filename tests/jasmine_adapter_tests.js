const fs = require('fs');
const path = require('path');
const vm = require('vm');
const expect = require('chai').expect;
const sinon = require('sinon');

const adapterSource = fs.readFileSync(
  path.join(__dirname, '../public/testem/jasmine_adapter.js'),
  'utf8'
);

function loadAdapter() {
  const addReporter = sinon.spy();
  const context = {
    console: { warn: sinon.spy() },
    emit: sinon.spy(),
    jasmine: {
      getEnv: function() {
        return { addReporter };
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(adapterSource, context, {
    filename: 'jasmine_adapter.js'
  });

  return { addReporter, context };
}

describe('jasmineAdapter', function() {
  it('warns only once when initialized repeatedly', function() {
    const { context } = loadAdapter();

    context.jasmineAdapter();
    context.jasmineAdapter();

    expect(context.console.warn).to.have.been.calledOnce();
  });

  it('explains the Jasmine 1 migration path', function() {
    const { context } = loadAdapter();

    context.jasmineAdapter();

    expect(context.console.warn).to.have.been.calledWith(
      sinon.match('Jasmine 1.x')
        .and(sinon.match('deprecated'))
        .and(sinon.match('jasmine-core'))
        .and(sinon.match('jasmine2 adapter'))
    );
  });

  it('registers a Jasmine reporter while warning', function() {
    const { addReporter, context } = loadAdapter();

    context.jasmineAdapter();

    expect(addReporter).to.have.been.calledOnce();
    const reporter = addReporter.firstCall.args[0];
    expect(reporter).to.respondTo('reportRunnerStarting');
    expect(reporter).to.respondTo('reportSpecStarting');
    expect(reporter).to.respondTo('reportSpecResults');
    expect(reporter).to.respondTo('reportRunnerResults');
  });
});
