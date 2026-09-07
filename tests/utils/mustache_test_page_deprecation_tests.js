const expect = require('chai').expect;
const sinon = require('sinon');
const log = require('../../lib/log');
const {
  MUSTACHE_TEST_PAGE_WARNING,
  warnMustacheTestPage,
  resetMustacheTestPageWarning
} = require('../../lib/utils/mustache_test_page_deprecation');

describe('warnMustacheTestPage', function() {
  let sandbox;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    resetMustacheTestPageWarning();
  });

  afterEach(function() {
    sandbox.restore();
    resetMustacheTestPageWarning();
  });

  it('logs and emits a deprecation warning', function() {
    const logWarn = sandbox.stub(log, 'warn');
    const emitWarning = sandbox.stub(process, 'emitWarning');

    warnMustacheTestPage();

    expect(logWarn).to.have.been.calledWith(MUSTACHE_TEST_PAGE_WARNING);
    expect(emitWarning).to.have.been.calledWith(
      MUSTACHE_TEST_PAGE_WARNING,
      sinon.match({ code: 'TESTEM_MUSTACHE_TEST_PAGE_DEPRECATED' })
    );
  });

  it('warns only once per process', function() {
    const logWarn = sandbox.stub(log, 'warn');
    const emitWarning = sandbox.stub(process, 'emitWarning');

    warnMustacheTestPage();
    warnMustacheTestPage();

    expect(logWarn).to.have.been.calledOnce();
    expect(emitWarning).to.have.been.calledOnce();
  });
});
