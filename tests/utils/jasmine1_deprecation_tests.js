const expect = require('chai').expect;
const sinon = require('sinon');
const log = require('../../lib/log');
const {
  JASMINE1_FRAMEWORK_WARNING,
  warnJasmine1Framework
} = require('../../lib/utils/jasmine1_deprecation');

describe('warnJasmine1Framework', function() {
  let sandbox;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('logs and emits a deprecation warning', function() {
    const logWarn = sandbox.stub(log, 'warn');
    const emitWarning = sandbox.stub(process, 'emitWarning');

    warnJasmine1Framework();

    expect(logWarn).to.have.been.calledWith(JASMINE1_FRAMEWORK_WARNING);
    expect(emitWarning).to.have.been.calledWith(
      JASMINE1_FRAMEWORK_WARNING,
      sinon.match({ code: 'TESTEM_JASMINE1_DEPRECATED' })
    );
  });
});
