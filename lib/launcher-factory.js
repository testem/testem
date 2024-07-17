'use strict';

const Launcher = require('./launcher');
const _ = require('lodash');

function getUniqueId() {
  return process.hrtime().join('');
}

module.exports = class LauncherFactory {
  constructor(name, settings, config) {
    this.name = name;
    this.config = config;
    this.settings = settings;
  }

  create(options) {
    const id = getUniqueId();
    const settings = _.assignIn({ id }, this.settings, options);
    return new Launcher(this.name, settings, this.config);
  }
};
