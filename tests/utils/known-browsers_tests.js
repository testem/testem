'use strict';

var Bluebird = require('bluebird');
var _ = require('lodash');
var tmp = require('tmp');
var path = require('path');

var tmpDirAsync = Bluebird.promisify(tmp.dir);

var expect = require('chai').expect;
var file = require('chai-files').file;

var knownBrowsers = require('../../lib/utils/known-browsers');

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
    config = {
      getHomeDir: function() {
        return 'home/dir';
      },
      get: function() {
        return;
      }
    };

    return tmpDirAsync().then(function(path) {
      browserTmpDir = path;
    });
  });

  describe('Any platform', function() {
    describe('Firefox', function() {
      var firefox;

      beforeEach(function() {
        var browsers = knownBrowsers('any', config);

        firefox = _.find(browsers, function(browser) {
          return browser.name === 'Firefox';
        });
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
        expect(firefox.setup.call(launcher, config, function(err) {
          expect(err).to.be.null();
          expect(file(path.join(browserTmpDir, 'prefs.js'))).to.equal(
            'user_pref("browser.shell.checkDefaultBrowser", false);\n' +
            'user_pref("browser.cache.disk.smart_size.first_run", false);'
          );
          done();
        }));
      });
    });

    describe('Chrome', function() {
      var chrome;

      beforeEach(function() {
        var browsers = knownBrowsers('any', config);

        chrome = _.find(browsers, function(browser) {
          return browser.name === 'Chrome';
        });
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
    });

    describe('Safari', function() {
      var safari;

      beforeEach(function() {
        var browsers = knownBrowsers('any', config);

        safari = _.find(browsers, function(browser) {
          return browser.name === 'Safari';
        });
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
        expect(safari.setup.call(launcher, config, function(err) {
          expect(err).to.be.null();
          expect(file(path.join(browserTmpDir, 'start.html'))).to.equal(
            '<script>window.location = \'http://localhost:7357\'</script>'
          );
          done();
        }));
      });
    });

    describe('Opera', function() {
      var opera;

      beforeEach(function() {
        var browsers = knownBrowsers('any', config);

        opera = _.find(browsers, function(browser) {
          return browser.name === 'Opera';
        });
      });

      it('exists', function() {
        expect(opera).to.exist();
      });

      it('constructs correct args', function() {
        expect(opera.args.call(launcher, config, url)).to.deep.eq([
          '--user-data-dir=' + browserTmpDir, '-pd', browserTmpDir, url
        ]);
      });
    });

    describe('PhantomJS', function() {
      var phantomJS, scriptPath;

      beforeEach(function() {
        var browsers = knownBrowsers('any', config);

        phantomJS = _.find(browsers, function(browser) {
          return browser.name === 'PhantomJS';
        });
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
    });
  });

  describe('Windows', function() {
    describe('Internet Explorer', function() {
      var internetExplorer;

      beforeEach(function() {
        var browsers = knownBrowsers('win32', config);

        internetExplorer = _.find(browsers, function(browser) {
          return browser.name === 'IE';
        });
      });

      it('exists', function() {
        expect(internetExplorer).to.exist();
      });
    });
  });
});
