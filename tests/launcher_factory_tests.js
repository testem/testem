import LauncherFactory from "../lib/launcher-factory.js";
import Config from "../lib/config.js";
import { expect } from "chai";

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
