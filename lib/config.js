/*

config.js
=========

This object returns all config info for the app. It handles reading the `testem.yml`
or `testem.json` config file.

*/
'use strict';


var os = require('os');
var fs = require('fs');
var yaml = require('js-yaml');
var log = require('npmlog');
var path = require('path');
var glob = require('glob');
var url = require('url');
var querystring = require('querystring');
var Bluebird = require('bluebird');

var browser_launcher = require('./browser_launcher');
var LauncherFactory = require('./launcher-factory');
var Chars = require('./chars');
var pad = require('./strutils').pad;
var isa = require('./isa');
var fileExists = require('./fileutils').fileExists;
var uniqBy = require('lodash.uniqby');

var knownBrowsers = require('./utils/known-browsers');
var globAsync = Bluebird.promisify(glob);

class Config {
  constructor(appMode, progOptions, config) {
    this.appMode = appMode;
    this.progOptions = progOptions || {};
    this.defaultOptions = {};
    this.fileOptions = {};
    this.config = config || {};
    this.getters = {
      test_page: 'getTestPage'
    };

    if (appMode === 'dev') {
      this.progOptions.reporter = 'dev';
      this.progOptions.parallel = -1;
    }

    if (this.progOptions.debug === true) {
      this.progOptions.debug = 'testem.log';
    }

    if (appMode === 'ci') {
      this.progOptions.disable_watching = true;
      this.progOptions.single_run = true;
    }
  }

  setDefaultOptions(defaultOptions) {
    this.defaultOptions = defaultOptions;
  }

  read(callback) {
    var configFile = this.progOptions.file;

    if (configFile) {
      this.readConfigFile(configFile, callback);
    } else {
      log.info('Seeking for config file...');

      // Try all testem.json, testem.yml and testem.js
      // testem.json gets precedence
      var files = ['testem.json', '.testem.json', '.testem.yml', 'testem.yml', 'testem.js', '.testem.js'];
      return Bluebird.filter(files.map(this.resolveConfigPath.bind(this)), fileExists).then(matched => {
        var configFile = matched[0];
        if (matched.length > 1) {
          var baseNames = matched.map(fileName => path.basename(fileName));
          console.warn('Found ' + matched.length + ' config files (' + baseNames + '), using ' + baseNames[0]);
        }
        if (configFile) {
          this.readConfigFile(configFile, callback);
        } else {
          if (callback) {
            callback.call(this);
          }
        }
      });
    }
  }

  resolvePath(filepath) {
    if (filepath[0] === '/') {
      return filepath;
    }

    return path.resolve(this.cwd(), filepath);
  }

  client() {
    return {
      decycle_depth: this.get('client_decycle_depth')
    };
  }

  resolveConfigPath(filepath) {
    if (this.progOptions.config_dir) {
      return path.resolve(this.progOptions.config_dir, filepath);
    } else if (this.defaultOptions && this.defaultOptions.config_dir) {
      return path.resolve(this.defaultOptions.config_dir, filepath);
    } else {
      return this.resolvePath(filepath);
    }
  }

  reverseResolvePath(filepath) {
    return path.relative(this.cwd(), filepath);
  }

  cwd() {
    return this.get('cwd') || process.cwd();
  }

  readConfigFile(configFile, callback) {
    if (!configFile) { // allow empty configFile for programmatic setups
      if (callback) {
        callback.call(this);
      }
    } else if (configFile.match(/\.js$/)) {
      this.readJS(configFile, callback);
    } else if (configFile.match(/\.json$/)) {
      this.readJSON(configFile, callback);
    } else if (configFile.match(/\.yml$/)) {
      this.readYAML(configFile, callback);
    } else {
      log.error('Unrecognized config file format for ' + configFile);
      if (callback) {
        callback.call(this);
      }
    }
  }

  readJS(configFile, callback) {
    this.fileOptions = require(this.resolveConfigPath(configFile));
    if (callback) {
      callback.call(this);
    }
  }

  readYAML(configFile, callback) {
    fs.readFile(configFile, (err, data) => {
      if (!err) {
        var cfg = yaml.load(String(data));
        this.fileOptions = cfg;
      }
      if (callback) {
        callback.call(this);
      }
    });
  }

  readJSON(configFile, callback) {
    fs.readFile(configFile, (err, data) => {
      if (!err) {
        var cfg = JSON.parse(data.toString());
        this.fileOptions = cfg;
        this.progOptions.file = configFile;
      }
      if (callback) {
        callback.call(this);
      }
    });
  }

  mergeUrlAndQueryParams(urlString, queryParamsObj) {
    if (!queryParamsObj) {
      return urlString;
    }

    if (typeof queryParamsObj === 'string') {
      if (queryParamsObj[0] === '?') {
        queryParamsObj = queryParamsObj.substr(1);
      }
      queryParamsObj = querystring.parse(queryParamsObj);
    }

    var urlObj = url.parse(urlString);
    var outputQueryParams = querystring.parse(urlObj.query) || {};
    Object.keys(queryParamsObj).forEach(param => {
      outputQueryParams[param] = queryParamsObj[param];
    });
    urlObj.query = outputQueryParams;
    urlObj.search = querystring.stringify(outputQueryParams)
      .replace(/=&/g, '&')
      .replace(/=$/, '');
    urlObj.path = urlObj.pathname + urlObj.search;
    return url.format(urlObj);
  }

  getTestPage() {
    var testPage = this.getConfigProperty('test_page');
    var queryParams = this.getConfigProperty('query_params');

    if (!Array.isArray(testPage)) {
      testPage = [testPage];
    }

    return testPage.map(page => this.mergeUrlAndQueryParams(page, queryParams));
  }

  getConfigProperty(key) {
    if (this.config && key in this.config) {
      return this.config[key];
    }
    if (key in this.progOptions && typeof this.progOptions[key] !== 'undefined') {
      return this.progOptions[key];
    }
    if (key in this.fileOptions && typeof this.fileOptions[key] !== 'undefined') {
      return this.fileOptions[key];
    }
    if (this.defaultOptions && key in this.defaultOptions && typeof this.defaultOptions[key] !== 'undefined') {
      return this.defaultOptions[key];
    }
    if (key in this.defaults) {
      var defaultVal = this.defaults[key];
      if (typeof defaultVal === 'function') {
        return defaultVal.call(this);
      } else {
        return defaultVal;
      }
    }
  }

  get(key) {
    var getterKey = this.getters[key];
    var getter = getterKey && this[getterKey];
    if (getter) {
      return getter.call(this, key);
    } else {
      return this.getConfigProperty(key);
    }
  }

  set(key, value) {
    if (!this.config) {
      this.config = {};
    }
    this.config[key] = value;
  }

  isCwdMode() {
    return !this.get('src_files') && !this.get('test_page');
  }

  getAvailableLaunchers(cb) {
    var browsers = knownBrowsers(process.platform, this);
    browser_launcher.getAvailableBrowsers(this, browsers, (err, availableBrowsers) => {
      if (err) {
        return cb(err);
      }

      var availableLaunchers = {};
      availableBrowsers.forEach(browser => {
        var newLauncher = new LauncherFactory(browser.name, browser, this);
        availableLaunchers[browser.name.toLowerCase()] = newLauncher;
      });

      // add custom launchers
      var customLaunchers = this.get('launchers');
      if (customLaunchers) {
        for (var name in customLaunchers) {
          var newLauncher = new LauncherFactory(name, customLaunchers[name], this);
          availableLaunchers[name.toLowerCase()] = newLauncher;
        }
      }
      cb(null, availableLaunchers);
    });
  }

  getLaunchers(cb) {
    this.getAvailableLaunchers((err, availableLaunchers) => {
      if (err) {
        return cb(err);
      }

      this.getWantedLaunchers(availableLaunchers, cb);
    });
  }

  getWantedLauncherNames(available) {
    var launchers = this.get('launch');
    if (launchers) {
      launchers = launchers.toLowerCase().split(',');
    } else if (this.appMode === 'dev') {
      launchers = this.get('launch_in_dev') || [];
    } else {
      launchers = this.get('launch_in_ci') || Object.keys(available);
    }

    var skip = this.get('skip');
    if (skip) {
      skip = skip.toLowerCase().split(',');
      launchers = launchers.filter(name => skip.indexOf(name) === -1);
    }
    return launchers;
  }

  getWantedLaunchers(available, cb) {
    var launchers = [];
    var wanted = this.getWantedLauncherNames(available);
    var err = null;

    wanted.forEach(name => {
      var launcher = available[name.toLowerCase()];
      if (!launcher) {
        if (this.appMode === 'dev' || this.get('ignore_missing_launchers')) {
          log.warn('Launcher "' + name + '" is not recognized.');
        } else {
          err = new Error('Launcher ' + name + ' not found. Not installed?');
        }
      } else {
        launchers.push(launcher);
      }
    });
    cb(err, launchers);
  }

  printLauncherInfo() {
    this.getAvailableLaunchers((err, launchers) => {
      var launch_in_dev = (this.get('launch_in_dev') || [])
        .map(s => s.toLowerCase());
      var launch_in_ci = this.get('launch_in_ci');
      if (launch_in_ci) {
        launch_in_ci = launch_in_ci.map(s => s.toLowerCase());
      }
      launchers = Object.keys(launchers).map(k => launchers[k]);
      console.log('Have ' + launchers.length + ' launchers available; auto-launch info displayed on the right.');
      console.log(); // newline
      console.log('Launcher      Type          CI  Dev');
      console.log('------------  ------------  --  ---');
      console.log(launchers.map(launcher => {
        var protocol = launcher.settings.protocol;
        var kind = protocol === 'browser' ?
          'browser' : (
            protocol === 'tap' ?
              'process(TAP)' : 'process');
        var dev = launch_in_dev.indexOf(launcher.name.toLowerCase()) !== -1 ?
          Chars.mark :
          ' ';
        var ci = !launch_in_ci || launch_in_ci.indexOf(launcher.name.toLowerCase()) !== -1 ?
          Chars.mark :
          ' ';
        return (pad(launcher.name, 14, ' ', 1) +
          pad(kind, 12, ' ', 1) +
          '  ' + ci + '    ' + dev + '      ');
      }).join('\n'));
    });
  }

  getFileSet(want, dontWant, callback) {
    if (isa(want, String)) {
      want = [want]; // want is an Array
    }
    if (isa(dontWant, String)) {
      dontWant = [dontWant]; // dontWant is an Array
    }

    // Filter glob < 6 negation patterns to still support them
    // See https://github.com/isaacs/node-glob/tree/3f883c43#comments-and-negation
    var positiveWants = [];
    want.forEach(patternEntry => {
      var pattern = isa(patternEntry, String) ? patternEntry : patternEntry.src;
      if (pattern.indexOf('!') === 0) {
        return dontWant.push(pattern.substring(1));
      }

      positiveWants.push(patternEntry);
    });

    dontWant = dontWant.map(p => p ? this.resolvePath(p) : p);
    Bluebird.reduce(positiveWants, (allThatIWant, patternEntry) => {
      var pattern = isa(patternEntry, String) ? patternEntry : patternEntry.src;
      var attrs = patternEntry.attrs || [];
      var patternUrl = url.parse(pattern);

      if (patternUrl.protocol === 'file:') {
        pattern = patternUrl.hostname + patternUrl.path;
      } else if (patternUrl.protocol) {
        return allThatIWant.concat({src: pattern, attrs: attrs});
      }

      return globAsync(this.resolvePath(pattern), { ignore: dontWant }).then(files => allThatIWant.concat(files.map(f => {
        f = this.reverseResolvePath(f);
        return {src: f, attrs: attrs};
      })));
    }, [])
      .then(result => uniqBy(result, 'src'))
      .asCallback(callback);
  }

  getSrcFiles(callback) {
    var srcFiles = this.get('src_files') || '*.js';
    var srcFilesIgnore = this.get('src_files_ignore') || '';
    this.getFileSet(srcFiles, srcFilesIgnore, callback);
  }

  getServeFiles(callback) {
    var want = this.get('serve_files') || this.get('src_files') || '*.js';
    var dontWant = this.get('serve_files_ignore') || this.get('src_files_ignore') || '';
    this.getFileSet(want, dontWant, callback);
  }

  getUserDataDir() {
    if (this.get('user_data_dir')) {
      return path.resolve(this.cwd(), this.get('user_data_dir'));
    }

    return os.tmpdir();
  }

  getHomeDir() {
    return process.env.HOME || process.env.USERPROFILE;
  }

  getCSSFiles(callback) {
    var want = this.get('css_files') || '';
    this.getFileSet(want, '', callback);
  }

  getAllOptions() {
    var options = [];
    function getOptions(o) {
      if (!o) {
        return;
      }
      if (o.options) {
        o.options.forEach(o => {
          options.push(o.name());
        });
      }
      getOptions(o.parent);
    }
    getOptions(this.progOptions);
    return options;
  }

  getTemplateData(cb) {
    var ret = {};
    var options = this.getAllOptions();
    var key;
    for (key in this.progOptions) {
      if (options.indexOf(key) !== -1) {
        ret[key] = this.progOptions[key];
      }
    }
    for (key in this.fileOptions) {
      ret[key] = this.fileOptions[key];
    }
    for (key in this.config) {
      ret[key] = this.config[key];
    }
    this.getServeFiles((err, files) => {
      var replaceSlashes = f => ({
        src: f.src.replace(/\\/g, '/'),
        attrs: f.attrs
      });

      ret.serve_files = files.map(replaceSlashes);

      this.getCSSFiles((err, files) => {
        ret.css_files = files.map(replaceSlashes);
        if (cb) {
          cb(err, ret);
        }
      });
    });
  }
}

Config.prototype.defaults = {
  host: 'localhost',
  port: 7357,
  url: function() {
    var scheme = 'http';
    if (this.get('key') || this.get('pfx')) {
      scheme = 'https';
    }
    return scheme + '://' + this.get('host') + ':' + this.get('port') + '/';
  },
  parallel: 1,
  reporter: 'tap',
  bail_on_uncaught_error: true,
  browser_start_timeout: 30,
  browser_disconnect_timeout: 10,
  client_decycle_depth: 5,
  socket_heartbeat_timeout: 5
};

module.exports = Config;
