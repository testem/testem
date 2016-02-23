/*

browser_launcher.js
===================

This file more or less figures out how to launch any browser on any platform.

*/

var path = require('path');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var async = require('async');
var fs = require('fs');
var fileutils = require('./fileutils');
var browserExeExists = fileutils.browserExeExists;
var findableByWhich = fileutils.findableByWhich;
var findableByWhichOrModule = fileutils.findableByWhichOrModule;
var findableByWhereOrModule = fileutils.findableByWhereOrModule;

function setupFirefoxProfile(profileDir, done) {
  rimraf(profileDir, function() {
    // using prefs.js to suppress the check default browser popup
    // and the welcome start page
    var prefs = [
      'user_pref("browser.shell.checkDefaultBrowser", false);',
      'user_pref("browser.cache.disk.smart_size.first_run", false);'
    ];
    mkdirp(profileDir, function() {
      fs.writeFile(profileDir + '/prefs.js', prefs.join('\n'), function() {
        done();
      });
    });
  });
}

function buildPhantomJsArgs(config) {
  var options = [path.join(path.dirname(__dirname), '/assets/phantom.js'), this.getUrl()];
  var debug_port = config.get('phantomjs_debug_port');
  if (debug_port) {
    options.unshift('--remote-debugger-autorun=true');
    options.unshift('--remote-debugger-port=' + debug_port);
  }
  var phantom_args = config.get('phantomjs_args');
  if (phantom_args) {
    options = phantom_args.concat(options);
  }
  return options;
}

// Return the catalogue of the browsers that Testem supports for the platform. Each 'browser object'
// will contain these fields:
//
// * `name` - the display name of the browser
// * `exe` - path to the executable to use to launch the browser
// * `setup(app, done)` - any initial setup needed before launching the executable(this is async,
//        the second parameter `done()` must be invoked when done).
// * `supported(cb)` - an async function which tells us whether the browser is supported by the current machine.
function browsersForPlatform(config, cb) {
  var platform = process.platform;
  var userDataDir = config.getUserDataDir();
  var userHomeDir = config.getHomeDir();

  function getUserDataDir(browser, id, platform) {
    var separator = platform === 'win32' ? '\\' : '/';
    return userDataDir + separator + 'testem-' + id + '.' + browser;
  }

  if (platform === 'win32') {
    cb([
      {
        name: 'IE',
        exe: 'C:\\Program Files\\Internet Explorer\\iexplore.exe',
        supported: browserExeExists
      },
      {
        name: 'Firefox',
        exe: [
          'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
          'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe'
        ],
        args: function(config, url) {
          return ['-profile', getUserDataDir('firefox', this.id, platform), url];
        },
        setup: function(config, done) {
          setupFirefoxProfile(getUserDataDir('firefox', this.id), done);
        },
        supported: browserExeExists
      },
      {
        name: 'Chrome',
        exe: [
          userHomeDir + '\\Local Settings\\Application Data\\Google\\Chrome\\Application\\chrome.exe',
          userHomeDir + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files\\Google\\Chrome\\Application\\Chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\Chrome.exe'
        ],
        args: function(config, url) {
          return ['--user-data-dir=' + getUserDataDir('chrome', this.id, platform), '--no-default-browser-check', '--no-first-run', '--ignore-certificate-errors', '--test-type', url];
        },
        setup: function(config, done) {
          rimraf(getUserDataDir('chrome', this.id, platform), done);
        },
        supported: browserExeExists
      },
      {
        name: 'Safari',
        exe: [
          'C:\\Program Files\\Safari\\safari.exe',
          'C:\\Program Files (x86)\\Safari\\safari.exe'
        ],
        supported: browserExeExists
      },
      {
        name: 'Opera',
        exe: [
          'C:\\Program Files\\Opera\\opera.exe',
          'C:\\Program Files (x86)\\Opera\\opera.exe'
        ],
        args: function(config, url) {
          var operaDataDir = getUserDataDir('opera', this.id, platform);
          return ['--user-data-dir=' + operaDataDir, '-pd', operaDataDir, url];
        },
        setup: function(config, done) {
          rimraf(getUserDataDir('opera', this.id, platform), done);
        },
        supported: browserExeExists
      },
      {
        name: 'PhantomJS',
        exe: 'phantomjs',
        useCrossSpawn: true,
        args: buildPhantomJsArgs,
        supported: findableByWhereOrModule
      }
    ]);
  } else if (platform === 'darwin') {
    cb([
      {
        name: 'Chrome',
        exe: [
          process.env.HOME + '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
          '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome'
        ],
        args: function(config, url) {
          return ['--user-data-dir=' + getUserDataDir('chrome', this.id), '--no-default-browser-check', '--no-first-run', '--ignore-certificate-errors', '--test-type', url];
        },
        setup: function(config, done) {
          rimraf(getUserDataDir('chrome', this.id), done);
        },
        supported: browserExeExists
      },
      {
        name: 'Chrome Canary',
        exe: [
          process.env.HOME + '/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary',
          '/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary'
        ],
        args: function(config, url) {
          return ['--user-data-dir=' + getUserDataDir('chrome-canary', this.id), '--no-default-browser-check', '--no-first-run', '--ignore-certificate-errors', '--test-type', url];
        },
        setup: function(config, done) {
          rimraf(getUserDataDir('chrome-canary', this.id), done);
        },
        supported: browserExeExists
      },
      {
        name: 'Firefox',
        exe: [
          process.env.HOME + '/Applications/Firefox.app/Contents/MacOS/firefox',
          '/Applications/Firefox.app/Contents/MacOS/firefox'
        ],
        args: function(config, url) {
          return ['-profile', getUserDataDir('firefox', this.id), url];
        },
        setup: function(config, done) {
          setupFirefoxProfile(getUserDataDir('firefox', this.id), done);
        },
        supported: browserExeExists
      },
      {
        name: 'Safari',
        exe: [
          process.env.HOME + '/Applications/Safari.app/Contents/MacOS/Safari',
          '/Applications/Safari.app/Contents/MacOS/Safari'
        ],
        setup: function(config, done) {
          var url = this.getUrl();
          fs.writeFile(getUserDataDir('safari', this.id) + '.html', '<script>window.location = \'' + url + '\'</script>', done);
        },
        args: function() {
          return [getUserDataDir('safari', this.id) + '.html'];
        },
        supported: browserExeExists
      },
      {
        name: 'Opera',
        exe: [
          process.env.HOME + '/Applications/Opera.app/Contents/MacOS/Opera',
          '/Applications/Opera.app/Contents/MacOS/Opera'
        ],
        args: function(config, url) {
          var operaDataDir = getUserDataDir('opera', this.id);
          return ['--user-data-dir=' + operaDataDir, '-pd', operaDataDir, url];
        },
        setup: function(config, done) {
          rimraf(getUserDataDir('opera', this.id), done);
        },
        supported: browserExeExists
      },
      {
        name: 'PhantomJS',
        exe: 'phantomjs',
        args: buildPhantomJsArgs,
        supported: findableByWhichOrModule
      }
    ]);
  } else if (platform === 'linux') {
    cb([
      {
        name: 'Firefox',
        exe: 'firefox',
        args: function(config, url) {
          return ['-no-remote', '-profile', getUserDataDir('firefox', this.id), url];
        },
        setup: function(config, done) {
          setupFirefoxProfile(getUserDataDir('firefox', this.id), done);
        },
        supported: findableByWhich
      },
      {
        name: 'Chrome',
        exe: 'google-chrome',
        args: function(config, url) {
          return ['--user-data-dir=' + getUserDataDir('chrome', this.id), '--no-default-browser-check', '--no-first-run', '--ignore-certificate-errors', url];
        },
        setup: function(config, done) {
          rimraf(getUserDataDir('chrome', this.id), done);
        },
        supported: findableByWhich
      },
      {
        name: 'Chromium',
        exe: ['chromium', 'chromium-browser'],
        args: function(config, url) {
          return ['--user-data-dir=' + getUserDataDir('chromium', this.id), '--no-default-browser-check', '--no-first-run', '--ignore-certificate-errors', url];
        },
        setup: function(config, done) {
          rimraf(getUserDataDir('chromium', this.id), done);
        },
        supported: findableByWhich
      },
      {
        name: 'PhantomJS',
        exe: 'phantomjs',
        args: buildPhantomJsArgs,
        supported: findableByWhichOrModule
      }
    ]);
  } else if (platform === 'sunos') {
    cb([
        {
          name: 'PhantomJS',
          exe: 'phantomjs',
          args: buildPhantomJsArgs,
          supported: findableByWhichOrModule
        }
      ]);
  } else if (platform === 'freebsd') {
    cb([
        {
          name: 'PhantomJS',
          exe: 'phantomjs',
          args: buildPhantomJsArgs,
          supported: findableByWhichOrModule
        }
      ]);
  } else {
    cb([]);
  }
}

// Returns the avaliable browsers on the current machine.
function getAvailableBrowsers(config, cb) {
  browsersForPlatform(config, function(browsers) {
    browsers.forEach(function(b) {
      b.protocol = 'browser';
    });
    async.filter(browsers, function(browser, cb) {
      browser.supported(cb);
    }, function(available) {
      cb(available);
    });
  });
}

exports.getAvailableBrowsers = getAvailableBrowsers;
