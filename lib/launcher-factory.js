'use strict';

var Launcher = require('./launcher');
var extend = require('lodash.assignin');

class LauncherFactory {
  constructor(name, settings, config) {
    this.name = name;
    this.config = config;
    this.settings = settings;
  }

  create(options) {
    var settings = extend({}, this.settings, options);
    return new Launcher(this.name, settings, this.config);
  }
}

module.exports = LauncherFactory;
