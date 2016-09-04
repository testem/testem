'use strict';

var capitalize = require('../../lib/utils/capitalize');
var expect = require('chai').expect;

describe('capitalize', function() {
  it('capitalizes the first letter of a string', function() {
    expect(capitalize('lowercase')).to.equal('Lowercase');
  });

  it('capitalizes the fist letter of each word in a string', function() {
    expect(capitalize('chrome canary')).to.equal('Chrome Canary');
  });

  it('capitalizes phantomjs correctly', function() {
    expect(capitalize('phantomjs')).to.equal('PhantomJS');
  });

  it('ignores non-string arguments', function() {
    var badInputs = [ 0, [], {}, NaN, null, undefined ];

    badInputs.forEach(function(input) {
      expect(capitalize(input)).to.equal(undefined);
    });
  });
});
