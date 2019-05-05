'use strict';

const path = require('path');
const fs = require('fs');

const expect = require('chai').expect;

const envWithLocalPath = require('../lib/utils/env-with-local-path');
const Config = require('../lib/config');

describe('envWithLocalPath', function() {
  it('returns the process env with the local node module path from the config added if it exists', function() {
    let tempPath = path.join(process.cwd(), 'tmp');
    let cumulativeTempPath = tempPath;
    fs.mkdirSync(cumulativeTempPath);
    cumulativeTempPath = path.join(cumulativeTempPath, 'node_modules');
    fs.mkdirSync(cumulativeTempPath);
    cumulativeTempPath = path.join(cumulativeTempPath, '.bin');
    fs.mkdirSync(cumulativeTempPath);
    let config = new Config('ci', {}, {
      cwd: tempPath
    });
    let env = envWithLocalPath(config);
    expect(env[envWithLocalPath.PATH]).to.contain(cumulativeTempPath);
    fs.rmdirSync(cumulativeTempPath);
    cumulativeTempPath = path.dirname(cumulativeTempPath);
    fs.rmdirSync(cumulativeTempPath);
    cumulativeTempPath = path.dirname(cumulativeTempPath);
    fs.rmdirSync(cumulativeTempPath);
  });

  it('returns the process env with the local node module path added', function() {
    let config = new Config('ci', {}, {});
    let env = envWithLocalPath(config);
    expect(env[envWithLocalPath.PATH]).to.contain(
      path.join(process.cwd(), 'node_modules', '.bin')
    );
  });

  it('does not modify process.env', function() {
    let config = new Config('ci', {}, {});
    envWithLocalPath(config);
    expect(process.env[envWithLocalPath.PATH]).not.to.contain(
      path.join(process.cwd(), 'node_modules', '.bin')
    );
  });
});
