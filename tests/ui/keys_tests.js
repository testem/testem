const expect = require('chai').expect;
const { actionForKey, actionForRawByte, KEY_ACTIONS } = require('../../lib/reporters/dev/keys');

describe('dev key map', function () {
  const expected = {
    q: 'quit',
    Q: 'quit',
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

  it('is case-sensitive for non-quit letter keys', function () {
    expect(actionForKey('P')).to.equal(undefined);
    expect(actionForKey('B')).to.equal(undefined);
  });

  it('maps raw stdin bytes used after grabInput', function () {
    expect(actionForRawByte(0x03)).to.equal('quit');
    expect(actionForRawByte(0x71)).to.equal('quit');
    expect(actionForRawByte(0x51)).to.equal('quit');
    expect(actionForRawByte(0x0d)).to.equal('run');
    expect(actionForRawByte(0x20)).to.equal('pageDown');
    expect(actionForRawByte(0x78)).to.equal(undefined);
  });
});
