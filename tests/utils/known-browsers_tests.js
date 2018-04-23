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
          expect(file(path.join(browserTmpDir, 'user.js'))).to.equal(
            'user_pref("browser.shell.checkDefaultBrowser", false);\n' +
            'user_pref("browser.cache.disk.smart_size.first_run", false);'
          );
          done();
        });
      });

      it('allows to provide a custom user.js', function(done) {
        var customPrefsJSPath = path.join(__dirname, '../fixtures/firefox/custom_user.js');

        config.get = function(name) {
          if (name === 'firefox_user_js') {
            return customPrefsJSPath;
          }
        };

        firefox.setup.call(launcher, config, function(err) {
          expect(err).to.be.null();
          expect(file(path.join(browserTmpDir, 'user.js'))).to.equal(
            'user_pref("browser.shell.checkDefaultBrowser", false);\n' +
            'user_pref("browser.cache.disk.smart_size.first_run", false);\n' +
            'user_pref("dom.max_script_run_time", 0);\n'
          );
          done();
        });
      });

      it('allows a custom path to be used as the possiblePath for firefox ', function(){
        var customPath = '/my/custom/path/to/firefox';

        config.get = function(name) {
          if (name === 'browser_paths') {
            return {
              Firefox: customPath
            }
          }
        };

        browsers = knownBrowsers('any', config);
        firefox = findBrowser(browsers, 'Firefox');

        expect(firefox.possiblePath).to.be.a('string');
        expect(firefox.possiblePath).to.equal(customPath);
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

      it('allows a custom path to be used as the possiblePath for chrome ', function(){
        var customPath = '/my/custom/path/to/chrome';

        config.get = function(name) {
          if (name === 'browser_paths') {
            return {
              Chrome: customPath
            }
          }
        };

        browsers = knownBrowsers('any', config);
        chrome = findBrowser(browsers, 'Chrome');

        expect(chrome.possiblePath).to.be.a('string');
        expect(chrome.possiblePath).to.equal(customPath);
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

      it('allows a custom path to be used as the possiblePath for safari ', function(){
        var customPath = '/my/custom/path/to/safari';

        config.get = function(name) {
          if (name === 'browser_paths') {
            return {
              Safari: customPath
            }
          }
        };

        browsers = knownBrowsers('any', config);
        safari = findBrowser(browsers, 'Safari');

        expect(safari.possiblePath).to.be.a('string');
        expect(safari.possiblePath).to.equal(customPath);
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

    describe('Safari Technology Preview', function() {
      var browsers;
      var safariTP;

      function setup(browserName) {
        if (browserName) {
          addBrowserArgsToConfig(config, browserName);
        } else {
          config = createConfig();
        }

        browsers = knownBrowsers('any', config);
        safariTP = findBrowser(browsers, 'Safari Technology Preview');
      }

      beforeEach(function() {
        setup();
      });

      it('exists', function() {
        expect(safariTP).to.exist();
      });

      it('constructs correct args', function() {
        expect(safariTP.args.call(launcher, config, url)).to.deep.eq([
          path.join(browserTmpDir, 'start.html')
        ]);
      });

      it('creates a config file on setup', function(done) {
        safariTP.setup.call(launcher, config, function(err) {
          expect(err).to.be.null();
          expect(file(path.join(browserTmpDir, 'start.html'))).to.equal(
            '<script>window.location = \'http://localhost:7357\'</script>'
          );
          done();
        });
      });

      it('allows a custom path to be used as the possiblePath for Safari Technology Preview ', function(){
        var customPath = '/my/custom/path/to/safari-technology-preview';

        config.get = function(name) {
          if (name === 'browser_paths') {
            return {
              "Safari Technology Preview": customPath
            }
          }
        };

        browsers = knownBrowsers('any', config);
        safariTP = findBrowser(browsers, 'Safari Technology Preview');

        expect(safariTP.possiblePath).to.be.a('string');
        expect(safariTP.possiblePath).to.equal(customPath);
      });

      describe('browser_args', function() {
        beforeEach(function() {
          setup('Safari Technology Preview');
        });

        afterEach(function() {
          setup();
        });

        it('constructs correct args with browser_args', function() {
          expect(safariTP.args.call(launcher, config, url)).to.deep.eq([
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

      it('allows a custom path to be used as the possiblePath for opera ', function(){
        var customPath = '/my/custom/path/to/opera';

        config.get = function(name) {
          if (name === 'browser_paths') {
            return {
              Opera: customPath
            }
          }
        };

        browsers = knownBrowsers('any', config);
        opera = findBrowser(browsers, 'Opera');

        expect(opera.possiblePath).to.be.a('string');
        expect(opera.possiblePath).to.equal(customPath);
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

      it('allows a custom path to be used as the possiblePath for phantomjs ', function(){
        var customPath = '/my/custom/path/to/phantomjs';

        config.get = function(name) {
          if (name === 'browser_paths') {
            return {
              PhantomJS: customPath
            }
          }
        };

        browsers = knownBrowsers('any', config);
        phantomJS = findBrowser(browsers, 'PhantomJS');

        expect(phantomJS.possiblePath).to.be.a('string');
        expect(phantomJS.possiblePath).to.equal(customPath);
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

        it('constructs correct args with custom launch script', function() {
          var customScriptPath = './custom_phantom.js';

          config.get = function(name) {
            if (name === 'phantomjs_launch_script') {
              return customScriptPath;
            }
          };

          expect(phantomJS.args.call(launcher, config, url)).to.deep.eq([
            '--testem', customScriptPath, url
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

      it('allows a custom path to be used as the possiblePath for IE ', function(){
        var customPath = 'c:\\my\\custom\\path\\to\\IE';

        config.get = function(name) {
          if (name === 'browser_paths') {
            return {
              IE: customPath
            }
          }
        };

        browsers = knownBrowsers('win32', config);
        internetExplorer = findBrowser(browsers, 'IE');

        expect(internetExplorer.possiblePath).to.be.a('string');
        expect(internetExplorer.possiblePath).to.equal(customPath);
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
