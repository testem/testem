import { expect } from '/node_modules/chai/index.js';

const { describe, it } = globalThis;

describe('dogfood paging', function () {
  it('fills the messages pane with console output', function () {
    for (let i = 1; i <= 30; i++) {
      console.log('console line ' + i + ': paging needs more than a couple of hello tests');
    }
    console.warn('a warning for the messages pane');
    console.error('an error for the messages pane');
    console.info('an info line for color');
    expect(true).to.equal(true);
  });

  for (let i = 1; i <= 12; i++) {
    it('fails with a stack so the results pane can page (' + i + ')', function () {
      expect.fail(
        'intentional dogfood failure ' + i +
          ' — name, message, and stack should overflow a split pane'
      );
    });
  }

  for (let i = 1; i <= 8; i++) {
    it('passes quickly (' + i + ')', function () {
      expect(1 + 1).to.equal(2);
    });
  }

  for (let i = 1; i <= 6; i++) {
    it('is pending (' + i + ')');
  }
});

mocha.run();
