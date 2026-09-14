const expect = require('chai').expect;
const { escapeMarkup, segmentsToMarkup } = require('../../lib/reporters/dev/markup');

describe('markup', function () {
  describe('escapeMarkup', function () {
    it('doubles caret so terminal-kit does not treat it as markup', function () {
      expect(escapeMarkup('foo^bar')).to.equal('foo^^bar');
    });

    it('treats null as empty', function () {
      expect(escapeMarkup(null)).to.equal('');
    });
  });

  describe('segmentsToMarkup', function () {
    it('wraps known colors and leaves unknown colors plain', function () {
      expect(segmentsToMarkup([
        { text: 'ok', color: 'cyan' },
        { text: ' ^ ', color: 'none' },
        { text: 'fail', color: 'red' }
      ])).to.equal('^cok^ ^^ ^rfail^');
    });

    it('returns empty string for a missing list', function () {
      expect(segmentsToMarkup()).to.equal('');
    });
  });
});
