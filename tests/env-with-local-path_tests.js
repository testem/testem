'use strict';

var path = require('path');

var expect = require('chai').expect;

var envWithLocalPath = require('../lib/env-with-local-path');

describe('envWithLocalPath', function() {
  it('returns the process env with the local node module path added', function() {
    var env = envWithLocalPath();
    expect(env[envWithLocalPath.PATH]).to.contain(
      path.join(process.cwd(), 'node_modules', '.bin')
    );
  });

  it('does not modify process.env', function() {
    envWithLocalPath();
    expect(process.env[envWithLocalPath.PATH]).not.to.contain(
      path.join(process.cwd(), 'node_modules', '.bin')
    );
  });
});
