var Api = require('../lib/api');
var sinon = require('sinon');
var Config = require('../lib/config');
var expect = require('chai').expect;

describe('Api', function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(Config.prototype, 'read');
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('set defaults when using dev mode', function() {
    var api = new Api();
    api.startDev({parallel: 5, on_exit: 'test'});
    expect(api.config.read.callCount).to.equal(1);
    expect(api.config.get('on_exit')).to.equal('test');
    expect(api.config.get('parallel')).to.equal(-1);
    expect(api.config.get('reporter')).to.equal('dev');
  });

  it('set defaults when using CI mode', function() {
    var api = new Api();
    api.startCI({parallel: 5, on_exit: 'test'});
    expect(api.config.read.callCount).to.equal(1);
    expect(api.config.get('on_exit')).to.equal('test');
    expect(api.config.get('parallel')).to.equal(5);
    expect(api.config.get('disable_watching')).to.equal(true);
    expect(api.config.get('single_run')).to.equal(true);
  });
});
