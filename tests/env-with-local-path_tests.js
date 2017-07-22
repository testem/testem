'use strict';

var path = require('path');
var fs = require('fs');

var expect = require('chai').expect;

var envWithLocalPath = require('../lib/env-with-local-path');
var Config = require('../lib/config');

describe('envWithLocalPath', function() {
  it('returns the process env with the local node module path from the config added if it exists', function() {
    var tempPath = path.join(process.cwd(), 'tmp');
    var cumulativeTempPath = tempPath;
    fs.mkdirSync(cumulativeTempPath);
    cumulativeTempPath = path.join(cumulativeTempPath, 'node_modules');
    fs.mkdirSync(cumulativeTempPath);
    cumulativeTempPath = path.join(cumulativeTempPath, '.bin');
    fs.mkdirSync(cumulativeTempPath);
    var config = new Config('ci', {}, {
      cwd: tempPath
    });
    var env = envWithLocalPath(config);
    expect(env[envWithLocalPath.PATH]).to.contain(cumulativeTempPath);
    fs.rmdirSync(cumulativeTempPath);
    cumulativeTempPath = path.dirname(cumulativeTempPath);
    fs.rmdirSync(cumulativeTempPath);
    cumulativeTempPath = path.dirname(cumulativeTempPath);
    fs.rmdirSync(cumulativeTempPath);
  });

  it('returns the process env with the local node module path added', function() {
    var config = new Config('ci', {}, {});
    var env = envWithLocalPath(config);
    expect(env[envWithLocalPath.PATH]).to.contain(
      path.join(process.cwd(), 'node_modules', '.bin')
    );
  });

  it('does not modify process.env', function() {
    var config = new Config('ci', {}, {});
    envWithLocalPath(config);
    expect(process.env[envWithLocalPath.PATH]).not.to.contain(
      path.join(process.cwd(), 'node_modules', '.bin')
    );
  });
});
