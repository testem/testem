'use strict';

const Launcher = require('./launcher');
const extend = require('lodash.assignin');

module.exports = class LauncherFactory {
  constructor(name, settings, config) {
    this.name = name;
    this.config = config;
    this.settings = settings;
  }

  getUniqueId() {
    return process.hrtime().join('');
  }

  create(options) {
    const id = this.getUniqueId();
    const settings = extend({ id }, this.settings, options);
    return new Launcher(this.name, settings, this.config);
  }
};
