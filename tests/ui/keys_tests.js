const expect = require('chai').expect;
const { actionForKey, KEY_ACTIONS } = require('../../lib/reporters/dev/keys');

describe('dev key map', function () {
  const expected = {
    q: 'quit',
    CTRL_C: 'quit',
    ENTER: 'run',
    p: 'togglePause',
    LEFT: 'prevTab',
    RIGHT: 'nextTab',
    UP: 'scrollUp',
    DOWN: 'scrollDown',
    TAB: 'toggleFocus',
    ' ': 'pageDown',
    b: 'pageUp',
    u: 'halfPageUp',
    d: 'halfPageDown'
  };

  Object.keys(expected).forEach(function (name) {
    it('maps ' + JSON.stringify(name) + ' to ' + expected[name], function () {
      expect(actionForKey(name)).to.equal(expected[name]);
    });
  });

  it('exposes the same table as KEY_ACTIONS', function () {
    expect(KEY_ACTIONS).to.deep.equal(expected);
  });

  it('returns undefined for an unbound key', function () {
    expect(actionForKey('x')).to.equal(undefined);
    expect(actionForKey('SHIFT_TAB')).to.equal(undefined);
    expect(actionForKey('SPACE')).to.equal(undefined);
  });

  it('is case-sensitive for letter keys (matches charm today)', function () {
    expect(actionForKey('Q')).to.equal(undefined);
    expect(actionForKey('P')).to.equal(undefined);
    expect(actionForKey('B')).to.equal(undefined);
  });
});
