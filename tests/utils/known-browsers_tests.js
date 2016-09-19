'use strict';

var Bluebird = require('bluebird');
var find = require('lodash.find');
var tmp = require('tmp');
var path = require('path');

var tmpDirAsync = Bluebird.promisify(tmp.dir);

var expect = require('chai').expect;
var file = require('chai-files').file;

var knownBrowsers = require('../../lib/utils/known-browsers');

function addBrowserArgsToConfig(config, browserName) {
  config.get = function(name) {
    var args = {};

    if (name === 'browser_args') {
      args[browserName] = '--testem';
      return args;
    }
  };
}

function createConfig() {
  return {
    getHomeDir: function() {
      return 'home/dir';
    },
    get: function() {
      return;
    }
  };
}

function findBrowser(browsers, browserName) {
  return find(browsers, function(browser) {
    return browser.name === browserName;
  });
}

describe('knownBrowsers', function() {
  var browserTmpDir;
  var url = 'http://localhost:7357';
  var launcher = {
    browserTmpDir: function() {
      return browserTmpDir;
    },
    getUrl: function() {
      return url;
    }
  };
  var config;

  beforeEach(function() {
    config = createConfig();

    return tmpDirAsync().then(function(path) {
      browserTmpDir = path;
    });
  });

  describe('Any platform', function() {
    describe('Firefox', function() {
      var browsers;
      var firefox;

      function setup(browserName) {
        if (browserName) {
          addBrowserArgsToConfig(config, browserName);
        } else {
          config = createConfig();
        }

        browsers = knownBrowsers('any', config);
        firefox = findBrowser(browsers, 'Firefox');
      }

      beforeEach(function() {
        setup();
      });

      it('exists', function() {
        expect(firefox).to.exist();
      });

      it('constructs correct args', function() {
        expect(firefox.args.call(launcher, config, url)).to.deep.eq([
          '-profile', browserTmpDir, url
        ]);
      });

      it('creates a config file on setup', function(done) {
        firefox.setup.call(launcher, config, function(err) {
          expect(err).to.be.null();
          expect(file(path.join(browserTmpDir, 'prefs.js'))).to.equal(
            'user_pref("browser.shell.checkDefaultBrowser", false);\n' +
            'user_pref("browser.cache.disk.smart_size.first_run", false);\n' +
            'user_pref("dom.max_script_run_time", 0);'
          );
          done();
        });
      });

      describe('browser_args', function() {
        beforeEach(function() {
          setup('Firefox');
        });

        afterEach(function() {
          setup();
        });

        it('constructs correct args with browser_args', function() {
          expect(firefox.args.call(launcher, config, url)).to.deep.eq([
            '--testem', '-profile', browserTmpDir, url
          ]);
        });
      });
    });

    describe('Chrome', function() {
      var browsers;
      var chrome;

      function setup(browserName) {
        if (browserName) {
          addBrowserArgsToConfig(config, browserName);
        } else {
          config = createConfig();
        }

        browsers = knownBrowsers('any', config);
        chrome = findBrowser(browsers, 'Chrome');
      }

      beforeEach(function() {
        setup();
      });

      it('exists', function() {
        expect(chrome).to.exist();
      });

      it('constructs correct args', function() {
        expect(chrome.args.call(launcher, config, url)).to.deep.eq([
          '--user-data-dir=' + browserTmpDir,
          '--no-default-browser-check',
          '--no-first-run',
          '--ignore-certificate-errors',
          '--test-type',
          '--disable-renderer-backgrounding',
          '--disable-background-timer-throttling',
          url
        ]);
      });

      it('checks correct paths', function() {
        expect(chrome.possiblePath).to.deep.eq([
          'home/dir\\Local Settings\\Application Data\\Google\\Chrome\\Application\\chrome.exe',
          'home/dir\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files\\Google\\Chrome\\Application\\Chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\Chrome.exe',
          process.env.HOME + '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        ]);
      });

      describe('browser_args', function() {
        beforeEach(function() {
          setup('Chrome');
        });

        afterEach(function() {
          setup();
        });

        it('constructs correct args with browser_args', function() {
          expect(chrome.args.call(launcher, config, url)).to.deep.eq([
            '--testem',
            '--user-data-dir=' + browserTmpDir,
            '--no-default-browser-check',
            '--no-first-run',
            '--ignore-certificate-errors',
            '--test-type',
            '--disable-renderer-backgrounding',
            '--disable-background-timer-throttling',
            url
          ]);
        });
      });
    });

    describe('Safari', function() {
      var browsers;
      var safari;

      function setup(browserName) {
        if (browserName) {
          addBrowserArgsToConfig(config, browserName);
        } else {
          config = createConfig();
        }

        browsers = knownBrowsers('any', config);
        safari = findBrowser(browsers, 'Safari');
      }

      beforeEach(function() {
        setup();
      });

      it('exists', function() {
        expect(safari).to.exist();
      });

      it('constructs correct args', function() {
        expect(safari.args.call(launcher, config, url)).to.deep.eq([
          path.join(browserTmpDir, 'start.html')
        ]);
      });

      it('creates a config file on setup', function(done) {
        safari.setup.call(launcher, config, function(err) {
          expect(err).to.be.null();
          expect(file(path.join(browserTmpDir, 'start.html'))).to.equal(
            '<script>window.location = \'http://localhost:7357\'</script>'
          );
          done();
        });
      });

      describe('browser_args', function() {
        beforeEach(function() {
          setup('Safari');
        });

        afterEach(function() {
          setup();
        });

        it('constructs correct args with browser_args', function() {
          expect(safari.args.call(launcher, config, url)).to.deep.eq([
            '--testem', path.join(browserTmpDir, 'start.html')
          ]);
        });
      });
    });

    describe('Opera', function() {
      var browsers;
      var opera;

      function setup(browserName) {
        if (browserName) {
          addBrowserArgsToConfig(config, browserName);
        } else {
          config = createConfig();
        }

        browsers = knownBrowsers('any', config);
        opera = findBrowser(browsers, 'Opera');
      }

      beforeEach(function() {
        setup();
      });

      it('exists', function() {
        expect(opera).to.exist();
      });

      it('constructs correct args', function() {
        expect(opera.args.call(launcher, config, url)).to.deep.eq([
          '--user-data-dir=' + browserTmpDir, '-pd', browserTmpDir, url
        ]);
      });

      describe('browser_args', function() {
        beforeEach(function() {
          setup('Opera');
        });

        afterEach(function() {
          setup();
        });

        it('constructs correct args with browser_args', function() {
          expect(opera.args.call(launcher, config, url)).to.deep.eq([
            '--testem', '--user-data-dir=' + browserTmpDir, '-pd', browserTmpDir, url
          ]);
        });
      });
    });

    describe('PhantomJS', function() {
      var browsers;
      var phantomJS;
      var scriptPath;

      function setup(browserName) {
        if (browserName) {
          addBrowserArgsToConfig(config, browserName);
        } else {
          config = createConfig();
        }

        browsers = knownBrowsers('any', config);
        phantomJS = findBrowser(browsers, 'PhantomJS');
      }

      beforeEach(function() {
        setup();
        scriptPath = path.resolve(__dirname, '../../assets/phantom.js');
      });

      it('exists', function() {
        expect(phantomJS).to.exist();
      });

      it('constructs correct args', function() {
        expect(phantomJS.args.call(launcher, config, url)).to.deep.eq([
          scriptPath, url
        ]);
      });

      it('constructs correct args with phantomjs_debug_port', function() {
        config.get = function(name) {
          if (name === 'phantomjs_debug_port') {
            return '1234';
          }
        };

        expect(phantomJS.args.call(launcher, config, url)).to.deep.eq([
          '--remote-debugger-port=1234',
          '--remote-debugger-autorun=true',
          scriptPath,
          url
        ]);
      });

      it('constructs correct args with phantomjs_args', function() {
        config.get = function(name) {
          if (name === 'phantomjs_args') {
            return ['arg1', 'arg2'];
          }
        };

        expect(phantomJS.args.call(launcher, config, url)).to.deep.eq([
          'arg1', 'arg2', scriptPath, url
        ]);
      });

      describe('browser_args', function() {
        beforeEach(function() {
          setup('PhantomJS');
          scriptPath = path.resolve(__dirname, '../../assets/phantom.js');
        });

        afterEach(function() {
          setup();
        });

        it('constructs correct args and browser_args', function() {
          expect(phantomJS.args.call(launcher, config, url)).to.deep.eq([
            '--testem', scriptPath, url
          ]);
        });

        it('constructs correct args with phantomjs_debug_port and browser_args', function() {
          config.get = function(name) {
            if (name === 'phantomjs_debug_port') {
              return '1234';
            } else if (name === 'browser_args') {
              return {
                PhantomJS: '--testem'
              };
            }
          };

          expect(phantomJS.args.call(launcher, config, url)).to.deep.eq([
            '--testem',
            '--remote-debugger-port=1234',
            '--remote-debugger-autorun=true',
            scriptPath,
            url
          ]);
        });

        it('constructs correct args with phantomjs_args and browser_args', function() {
          config.get = function(name) {
            if (name === 'phantomjs_args') {
              return ['arg1', 'arg2'];
            } else if (name === 'browser_args') {
              return {
                PhantomJS: '--testem'
              };
            }
          };

          expect(phantomJS.args.call(launcher, config, url)).to.deep.eq([
            '--testem', 'arg1', 'arg2', scriptPath, url
          ]);
        });
      });
    });
  });

  describe('Windows', function() {
    describe('Internet Explorer', function() {
      var browsers;
      var internetExplorer;

      function setup(browserName) {
        if (browserName) {
          addBrowserArgsToConfig(config, browserName);
        } else {
          config = createConfig();
        }

        browsers = knownBrowsers('win32', config);
        internetExplorer = findBrowser(browsers, 'IE');
      }

      beforeEach(function() {
        setup();
      });

      it('exists', function() {
        expect(internetExplorer).to.exist();
      });

      describe('browser_args', function() {
        beforeEach(function() {
          setup('IE');
        });

        afterEach(function() {
          setup();
        });

        it('constructs correct args with browser_args', function() {
          expect(internetExplorer.args.call(launcher, config, url)).to.deep.eq([
            '--testem'
          ]);
        });
      });
    });
  });
});
