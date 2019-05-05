'use strict';

const expect = require('chai').expect;
const styledString = require('styled_string');
const strutils = require('../lib/utils/strutils');
const splitLines = strutils.splitLines;
const indent = strutils.indent;
const template = strutils.template;
const assert = require('chai').assert;

const isWin = /^win/.test(process.platform);

describe('splitLines', function() {
  it('splits on newline', function() {
    let s = 'abc\ndef';
    expect(splitLines(s, 10)).to.deep.equal(['abc', 'def']);
  });
  it('breaks a line', function() {
    let s = 'abcdef';
    expect(splitLines(s, 3)).to.deep.equal(['abc', 'def']);
  });
  it('splits and then breaks', function() {
    let s = 'abcd\nefghijkl';
    expect(splitLines(s, 5)).to.deep.equal(['abcd', 'efghi', 'jkl']);
  });

  describe('it also works on styled strings', !isWin ? function() {
    it('splits on newline', function() {
      let s = styledString('abc\ndef', {foreground: 'red'});
      let ss = splitLines(s, 10);
      expect(ss.length).to.equal(2);
      expect(ss[0].toString()).to.equal('\u001b[31mabc\u001b[0m');
      expect(ss[1].toString()).to.equal('\u001b[31mdef\u001b[0m');
    });
    it('splits and then breaks', function() {
      let s = styledString('abcd\nefghijkl', {foreground: 'red'});
      let ss = splitLines(s, 5);
      expect(ss.length).to.equal(3);
      expect(ss[0].toString()).to.equal('\u001b[31mabcd\u001b[0m');
      expect(ss[1].toString()).to.equal('\u001b[31mefghi\u001b[0m');
      expect(ss[2].toString()).to.equal('\u001b[31mjkl\u001b[0m');
    });

    it('handles empty lines', function() {
      let s = styledString('abc\n\ndef');
      let lines = splitLines(s, 5);
      assert.equal(lines.length, 3);
      assert.equal(lines[0].toString(), 'abc');
      assert.equal(lines[1].toString(), '');
      assert.equal(lines[2].toString(), 'def');
    });

  } : function() {
    xit('TODO: Fix and re-enable for windows');
  });

});

describe('indent', function() {
  it('should indent', function() {
    expect(indent('')).to.equal('    ');
    expect(indent('abc\ndef')).to.equal('    abc\n    def');
  });
});

describe('template', function() {
  it('should replace parameters with their values', function() {
    let str = 'a<foo>c<bar>e<bar><baz>';
    let params = {
      foo: 'b',
      bar: 'd'
    };
    expect(template(str, params)).to.equal('abcded<baz>');
  });
});
