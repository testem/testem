'use strict';

const Launcher = require('./launcher');
const extend = require('lodash.assignin');

module.exports = class LauncherFactory {
  constructor(name, settings, config) {
    this.name = name;
    this.config = config;
    this.settings = settings;
    this.ids = {};
  }

  getUniqueId() {
    let id = this.generateId();
    while (this.ids[id]) {
      id = this.generateId();
    }
    this.ids[id] = id;
    return id;
  }

  generateId() {
    return String(Math.floor(Math.random() * 10000));
  }

  create(options) {
    var id = this.getUniqueId();
    var settings = extend({ id }, this.settings, options);
    return new Launcher(this.name, settings, this.config);
  }
};
