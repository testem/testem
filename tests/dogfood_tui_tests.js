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

  it('runs the unit suite as TAP in the Mocha tab', function () {
    expect(dogfoodConfig.launchers).to.deep.equal({
      Mocha: {
        command: 'npx mocha tests/*_tests.js tests/**/*_tests.js -R tap',
        protocol: 'tap'
      }
    });
    expect(dogfoodConfig.launch_in_dev).to.deep.equal([
      'Chrome',
      'Firefox',
      'Safari',
      'Mocha'
    ]);
    expect(dogfoodConfig.test_page).to.equal(
      'tests/fixtures/dogfood_browser/test.html'
    );
  });

  it('leaves port 7357 free for the unit suite it runs', function () {
    // tests/ci/ci_tests.js binds 7357 to assert EADDRINUSE handling. If the
    // dogfood server holds it, that test hangs and the Mocha tab stops.
    expect(dogfoodConfig.port).to.equal(7400);
  });
});
