const expect = require('chai').expect;
const { footerHelp } = require('../../lib/reporters/dev/footer');

describe('footerHelp', function () {
  it('starts off showing p to pause', function () {
    expect(footerHelp({ hasRunners: false, paused: false })).to.contain('p to pause');
  });

  it('says paused when paused', function () {
    const text = footerHelp({ hasRunners: false, paused: true });
    expect(text).to.contain('p to unpause');
    expect(text).to.contain('PAUSED');
  });

  it('shows q to quit and not Press ENTER when there are no runners', function () {
    const text = footerHelp({ hasRunners: false, paused: false });
    expect(text).to.contain('q to quit');
    expect(text).to.not.contain('Press ENTER');
  });

  it('shows Press ENTER to run tests when there is at least one runner', function () {
    const text = footerHelp({ hasRunners: true, paused: false });
    expect(text).to.contain('Press ENTER to run tests; q to quit');
  });
});
