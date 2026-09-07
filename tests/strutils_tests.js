
const expect = require('chai').expect;
const strutils = require('../lib/utils/strutils');
const splitLines = strutils.splitLines;
const indent = strutils.indent;
const template = strutils.template;

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
