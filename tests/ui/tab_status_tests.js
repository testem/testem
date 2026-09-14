const expect = require('chai').expect;
const Backbone = require('backbone');
const { tabColor } = require('../../lib/reporters/dev/tab_status');

describe('tab_status', function () {
  it('is green when all passed and none pending', function () {
    const results = new Backbone.Model({
      passed: 1,
      pending: 0,
      total: 1
    });
    expect(tabColor(results, false)).to.equal('green');
  });

  it('is yellow when pending and all accounted for', function () {
    const results = new Backbone.Model({
      passed: 0,
      pending: 1,
      total: 1
    });
    expect(tabColor(results, false)).to.equal('yellow');
  });

  it('is red when fail_on_zero_tests and there are no tests', function () {
    const results = new Backbone.Model({
      passed: 0,
      pending: 0,
      total: 0
    });
    expect(tabColor(results, true)).to.equal('red');
  });

  it('is green when no results model (treat as success so far)', function () {
    expect(tabColor(undefined, false)).to.equal('green');
  });

  it('is red when some tests failed', function () {
    const results = new Backbone.Model({
      passed: 1,
      pending: 0,
      total: 2
    });
    expect(tabColor(results, false)).to.equal('red');
  });
});
