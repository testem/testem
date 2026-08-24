
var fs = require('fs');
var path = require('path');

var expect = require('chai').expect;
var connect = require('saucie/lib/connect');

describe('saucie connect (4.0.2+)', function() {
  it('exports waitForApiReadiness', function() {
    expect(connect.waitForApiReadiness).to.be.a('function');
  });

  it('exports prepareScBinary', function() {
    expect(connect.prepareScBinary).to.be.a('function');
  });

  it('preserves the SC binary path through tunnel cleanup', function() {
    return connect.prepareScBinary({ logger: function() {} }, {
      ensureScBinaryAsync: function() {
        return Promise.resolve('/tmp/sc');
      },
      stopExistingTunnelsAsync: function() {
        return Promise.resolve();
      }
    }).then(function(binPath) {
      expect(binPath).to.equal('/tmp/sc');
    });
  });
});

describe('saucie-connect hook', function() {
  it('requests detached startup with API readiness and a pid file', function() {
    var source = fs.readFileSync(
      path.join(__dirname, '../../examples/saucelabs/saucie-connect.js'),
      'utf8'
    );

    expect(source).to.match(/detached:\s*true/);
    expect(source).to.match(/waitForApiReady:\s*true/);
    expect(source).to.match(/pidfile:/);
  });
});
