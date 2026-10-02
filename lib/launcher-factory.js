import Launcher from "./launcher.js";

function getUniqueId() {
  return process.hrtime().join('');
}

export default class LauncherFactory {
  constructor(name, settings, config) {
    this.name = name;
    this.config = config;
    this.settings = settings;
  }

  create(options) {
    const id = getUniqueId();
    const settings = Object.assign({ id }, this.settings, options);
    return new Launcher(this.name, settings, this.config);
  }
}