const expect = require('chai').expect;
const dogfoodConfig = require('../testem.dogfood.js');
const {
  parseDogfoodArgs,
  selectLaunchers
} = require('../scripts/dogfood-tui');

describe('dogfood-tui', function () {
  describe('parseDogfoodArgs', function () {
    it('defaults to launching browsers', function () {
      expect(parseDogfoodArgs([])).to.deep.equal({ mochaOnly: false });
    });

    it('treats --mocha-only and --skip-browsers as mocha only', function () {
      expect(parseDogfoodArgs(['--mocha-only'])).to.deep.equal({ mochaOnly: true });
      expect(parseDogfoodArgs(['--skip-browsers'])).to.deep.equal({ mochaOnly: true });
    });
  });

  describe('selectLaunchers', function () {
    const available = {
      chrome: {},
      safari: {},
      mocha: {}
    };

    it('keeps installed browsers plus Mocha', function () {
      expect(selectLaunchers(available, { mochaOnly: false })).to.deep.equal({
        launch: ['Chrome', 'Safari', 'Mocha'],
        skipped: ['Firefox']
      });
    });

    it('can skip browsers', function () {
      expect(selectLaunchers(available, { mochaOnly: true })).to.deep.equal({
        launch: ['Mocha'],
        skipped: []
      });
    });
  });

  it('runs the unit suite via npm test so mocha globs expand', function () {
    expect(dogfoodConfig.launchers.Mocha.command).to.equal('npm test -- --reporter tap');
    expect(dogfoodConfig.launchers.Mocha.protocol).to.equal('tap');
  });
});
