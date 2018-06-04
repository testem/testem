'use strict';

const LauncherFactory = require('../lib/launcher-factory');
const Config = require('../lib/config');
const expect = require('chai').expect;

describe('Launcher Factory', function() {
  let settings, config, launcherFactory;

  beforeEach(function() {
    settings = {protocol: 'browser'};
    config = new Config(null, {port: '7357', url: 'http://blah.com/'});
    launcherFactory = new LauncherFactory('browserName', settings, config);
  });

  it('should generate a unique id', function() {
    const launcher = launcherFactory.create();

    expect(launcher.name).to.equal('browserName');
    expect(launcher.id).to.match(/([0-9]+)/);
  });
});
