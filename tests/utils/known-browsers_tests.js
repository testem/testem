

const { fromCallback } = require('../../lib/utils/promises');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const os = require('os');

const expect = require('chai').expect;
const file = require('chai-files').file;

const knownBrowsers = require('../../lib/utils/known-browsers');

function addBrowserArgsToConfig(config, browserName) {
  config.get = function(name) {
    let args = {};

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
  return _.find(browsers, function(browser) {
    return browser.name === browserName;
  });
}

describe('knownBrowsers', function() {
  let browserTmpDir;
  let url = 'http://localhost:7357';
  let launcher = {
    browserTmpDir: function() {
      return browserTmpDir;
    },
    getUrl: function() {
      return url;
    }
  };
  let config;

  beforeEach(function() {
    config = createConfig();

    browserTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testem-'));
  });

  afterEach(function() {
    if (browserTmpDir && fs.existsSync(browserTmpDir)) {
      fs.rmSync(browserTmpDir, { recursive: true, force: true });
    }
  });

  describe('Any platform', function() {
    describe('Firefox', function() {
      let browsers;
      let firefox;

      function setup(browserName) {
        if (browserName) {
          addBrowserArgsToConfig(config, browserName);
        } else {
          config = createConfig();
        }

        browsers = knownBrowsers('any', config);
        firefox = findBrowser(browsers, browserName || 'Firefox');
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

      it('creates a config file on setup', function() {
        return fromCallback(cb => firefox.setup.call(launcher, config, cb)).then(function() {
          expect(file(path.join(browserTmpDir, 'user.js'))).to.equal([
            'user_pref("browser.shell.checkDefaultBrowser", false);',
            'user_pref("browser.cache.disk.smart_size.first_run", false);',
            'user_pref("datareporting.policy.dataSubmissionEnabled", false);',
            'user_pref("datareporting.policy.dataSubmissionPolicyNotifiedTime", "1481830156314");',
            'user_pref("app.update.auto", false);',
            'user_pref("app.update.enabled", false);',
            'user_pref("browser.EULA.override", true);',
            'user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);',
            'user_pref("browser.aboutwelcome.enabled", false);',
            'user_pref("browser.startup.homepage", "about:blank");',
            'user_pref("browser.startup.page", 0);',
            'user_pref("browser.startup.firstrunSkipsHomepage", true);',
            'user_pref("browser.startup.homepage_override.mstone", "ignore");',
            'user_pref("browser.startup.homepage_welcome_url", "");',
            'user_pref("browser.startup.homepage_welcome_url.additional", "");',
            'user_pref("browser.startup.cohort", "ignore");',
            'user_pref("browser.messaging-system.prompts.enabled", false);',
            'user_pref("browser.onboarding.enabled", false);',
            'user_pref("browser.tour.enabled", false);',
            'user_pref("browser.startup.upgradeDialog.enabled", false);',
            'user_pref("browser.uiCustomization.skipDefaultState", true);',
            'user_pref("toolkit.telemetry.enabled", false);',
            'user_pref("toolkit.telemetry.unified", false);',
            'user_pref("browser.ping-centre.telemetry", false);',
            'user_pref("browser.sessionstore.resume_from_crash", false);',
            'user_pref("browser.tabs.warnOnClose", false);',
            'user_pref("browser.tabs.warnOnCloseOtherTabs", false);',
            'user_pref("browser.tabs.warnOnOpen", false);',
            'user_pref("browser.download.manager.showWhenStarting", false);',
            'user_pref("extensions.update.enabled", false);',
            'user_pref("dom.webnotifications.enabled", false);',
            'user_pref("gfx.direct2d.disabled", true);'
          ].join(os.EOL));
        });
      });

      it('allows to provide a custom user.js', function() {
        let customPrefsJSPath = path.join(__dirname, '../fixtures/firefox/custom_user.js');

        config.get = function(name) {
          if (name === 'firefox_user_js') {
            return customPrefsJSPath;
          }
        };

        return fromCallback(cb => firefox.setup.call(launcher, config, cb)).then(function() {
          expect(file(path.join(browserTmpDir, 'user.js'))).to.equal([
            'user_pref("browser.shell.checkDefaultBrowser", false);',
            'user_pref("browser.cache.disk.smart_size.first_run", false);',
            'user_pref("dom.max_script_run_time", 0);'
          ].join(os.EOL) + os.EOL);
        });
      });

      it('allows a custom path to be used as the possiblePath for firefox ', function() {
        let customPath = '/my/custom/path/to/firefox';

        config.get = function(name) {
          if (name === 'browser_paths') {
            return {
              Firefox: customPath
            };
          }
        };

        browsers = knownBrowsers('any', config);
        firefox = findBrowser(browsers, 'Firefox');

        expect(firefox.possiblePath).to.be.a('string');
        expect(firefox.possiblePath).to.equal(customPath);
      });

      it('allows a custom exe to be used as the possibleExe for firefox ', function() {
        let customExe = 'firefox-custom';

        config.get = function(name) {
          if (name === 'browser_exes') {
            return {
              Firefox: customExe
            };
          }
        };

        browsers = knownBrowsers('any', config);
        firefox = findBrowser(browsers, 'Firefox');

        expect(firefox.possibleExe).to.be.a('string');
        expect(firefox.possibleExe).to.equal(customExe);
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

      describe('headless browser_args', function() {
        beforeEach(function() {
          setup('Headless Firefox');
        });

        afterEach(function() {
          setup();
        });

        it('constructs correct args with browser_args', function() {
          expect(firefox.args.call(launcher, config, url)).to.deep.eq([
            '--testem', '-profile', '-headless', browserTmpDir, url
          ]);
        });
      });
    });

    describe('Chrome', function() {
      let browsers;
      let chrome;

      function setup(browserName) {
        if (browserName) {
          addBrowserArgsToConfig(config, browserName);
        } else {
          config = createConfig();
        }

        browsers = knownBrowsers('any', config);
        chrome = findBrowser(browsers, browserName || 'Chrome');
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
          '--disable-infobars',
          '--disable-session-crashed-bubble',
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

      it('allows a custom path to be used as the possiblePath for chrome ', function() {
        let customPath = '/my/custom/path/to/chrome';

        config.get = function(name) {
          if (name === 'browser_paths') {
            return {
              Chrome: customPath
            };
          }
        };

        browsers = knownBrowsers('any', config);
        chrome = findBrowser(browsers, 'Chrome');

        expect(chrome.possiblePath).to.be.a('string');
        expect(chrome.possiblePath).to.equal(customPath);
      });

      it('allows a custom exe to be used as the possibleExe for chrome ', function() {
        let customExe = 'chrome-custom';

        config.get = function(name) {
          if (name === 'browser_exes') {
            return {
              Chrome: customExe
            };
          }
        };

        browsers = knownBrowsers('any', config);
        chrome = findBrowser(browsers, 'Chrome');

        expect(chrome.possibleExe).to.be.a('string');
        expect(chrome.possibleExe).to.equal(customExe);
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
            '--disable-infobars',
            '--disable-session-crashed-bubble',
            url
          ]);
        });
      });

      describe('headless browser_args', function() {
        beforeEach(function() {
          setup('Headless Chrome');
        });

        afterEach(function() {
          setup();
        });

        it('constructs correct args with browser_args', function() {
          expect(chrome.args.call(launcher, config, url)).to.deep.eq([
            '--testem',
            '--headless',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--mute-audio',
            '--remote-debugging-port=0',
            '--window-size=1440,900',
            '--user-data-dir=' + browserTmpDir,
            '--no-default-browser-check',
            '--no-first-run',
            '--ignore-certificate-errors',
            '--test-type',
            '--disable-renderer-backgrounding',
            '--disable-background-timer-throttling',
            '--disable-infobars',
            '--disable-session-crashed-bubble',
            url
          ]);
        });
      });
    });

    describe('Safari', function() {
      let browsers;
      let safari;

      function setup(browserName, platform) {
        if (browserName) {
          addBrowserArgsToConfig(config, browserName);
        } else {
          config = createConfig();
        }

        browsers = knownBrowsers(platform, config);
        safari = findBrowser(browsers, 'Safari');
      }

      describe('on macOS', function() {
        const platform = 'darwin';

        beforeEach(function() {
          setup(null, platform);
        });

        it('exists', function() {
          expect(safari).to.exist();
        });

        it('constructs correct args (opens test URL via Launch Services)', function() {
          expect(safari.args.call(launcher, config, url)).to.deep.eq([
            '-a', 'Safari', url
          ]);
        });

        it('does not use a local start.html redirect', function() {
          expect(safari.setup).to.be.undefined();
        });

        it('sets ignoreProcessExit because /usr/bin/open exits after handoff', function() {
          expect(safari.ignoreProcessExit).to.equal(true);
        });

        it('allows a custom path to be used as the possiblePath for safari ', function() {
          let customPath = '/my/custom/path/to/open';

          config.get = function(name) {
            if (name === 'browser_paths') {
              return {
                Safari: customPath
              };
            }
          };

          browsers = knownBrowsers(platform, config);
          safari = findBrowser(browsers, 'Safari');

          expect(safari.possiblePath).to.be.a('string');
          expect(safari.possiblePath).to.equal(customPath);
        });

        it('allows a custom exe to be used as the possibleExe for safari ', function() {
          let customExe = 'open-custom';

          config.get = function(name) {
            if (name === 'browser_exes') {
              return {
                Safari: customExe
              };
            }
          };

          browsers = knownBrowsers(platform, config);
          safari = findBrowser(browsers, 'Safari');

          expect(safari.possibleExe).to.be.a('string');
          expect(safari.possibleExe).to.equal(customExe);
        });

        describe('browser_args', function() {
          beforeEach(function() {
            setup('Safari', platform);
          });

          afterEach(function() {
            setup(null, platform);
          });

          it('constructs correct args with browser_args', function() {
            expect(safari.args.call(launcher, config, url)).to.deep.eq([
              '--testem', '-a', 'Safari', url
            ]);
          });
        });
      });

      describe('on non-macOS', function() {
        const platform = 'win32';

        beforeEach(function() {
          setup(null, platform);
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

        it('allows a custom path to be used as the possiblePath for safari ', function() {
          let customPath = '/my/custom/path/to/safari';

          config.get = function(name) {
            if (name === 'browser_paths') {
              return {
                Safari: customPath
              };
            }
          };

          browsers = knownBrowsers(platform, config);
          safari = findBrowser(browsers, 'Safari');

          expect(safari.possiblePath).to.be.a('string');
          expect(safari.possiblePath).to.equal(customPath);
        });

        it('allows a custom exe to be used as the possibleExe for safari ', function() {
          let customExe = 'safari-custom';

          config.get = function(name) {
            if (name === 'browser_exes') {
              return {
                Safari: customExe
              };
            }
          };

          browsers = knownBrowsers(platform, config);
          safari = findBrowser(browsers, 'Safari');

          expect(safari.possibleExe).to.be.a('string');
          expect(safari.possibleExe).to.equal(customExe);
        });

        describe('browser_args', function() {
          beforeEach(function() {
            setup('Safari', platform);
          });

          afterEach(function() {
            setup(null, platform);
          });

          it('constructs correct args with browser_args', function() {
            expect(safari.args.call(launcher, config, url)).to.deep.eq([
              '--testem', path.join(browserTmpDir, 'start.html')
            ]);
          });
        });
      });
    });

    describe('Safari Technology Preview', function() {
      let browsers;
      let safariTP;
      const platform = 'darwin';

      function setup(browserName) {
        if (browserName) {
          addBrowserArgsToConfig(config, browserName);
        } else {
          config = createConfig();
        }

        browsers = knownBrowsers(platform, config);
        safariTP = findBrowser(browsers, 'Safari Technology Preview');
      }

      beforeEach(function() {
        setup();
      });

      it('exists on macOS only', function() {
        expect(safariTP).to.exist();
        expect(findBrowser(knownBrowsers('linux', config), 'Safari Technology Preview')).to.be.undefined();
      });

      it('constructs correct args (opens test URL via Launch Services)', function() {
        expect(safariTP.args.call(launcher, config, url)).to.deep.eq([
          '-a', 'Safari Technology Preview', url
        ]);
      });

      it('does not use a local start.html redirect', function() {
        expect(safariTP.setup).to.be.undefined();
      });

      it('sets ignoreProcessExit because /usr/bin/open exits after handoff', function() {
        expect(safariTP.ignoreProcessExit).to.equal(true);
      });

      it('allows a custom path to be used as the possiblePath for Safari Technology Preview ', function() {
        let customPath = '/my/custom/path/to/open';

        config.get = function(name) {
          if (name === 'browser_paths') {
            return {
              'Safari Technology Preview': customPath
            };
          }
        };

        browsers = knownBrowsers(platform, config);
        safariTP = findBrowser(browsers, 'Safari Technology Preview');

        expect(safariTP.possiblePath).to.be.a('string');
        expect(safariTP.possiblePath).to.equal(customPath);
      });

      it('allows a custom exe to be used as the possibleExe for Safari Technology Preview ', function() {
        let customExe = 'safari-technology-preview-custom';

        config.get = function(name) {
          if (name === 'browser_exes') {
            return {
              'Safari Technology Preview': customExe
            };
          }
        };

        browsers = knownBrowsers(platform, config);
        safariTP = findBrowser(browsers, 'Safari Technology Preview');

        expect(safariTP.possibleExe).to.be.a('string');
        expect(safariTP.possibleExe).to.equal(customExe);
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
            '--testem', '-a', 'Safari Technology Preview', url
          ]);
        });
      });
    });

    describe('Opera', function() {
      let browsers;
      let opera;

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

      it('allows a custom path to be used as the possiblePath for opera ', function() {
        let customPath = '/my/custom/path/to/opera';

        config.get = function(name) {
          if (name === 'browser_paths') {
            return {
              Opera: customPath
            };
          }
        };

        browsers = knownBrowsers('any', config);
        opera = findBrowser(browsers, 'Opera');

        expect(opera.possiblePath).to.be.a('string');
        expect(opera.possiblePath).to.equal(customPath);
      });

      it('allows a custom exe to be used as the possibleExe for opera ', function() {
        let customExe = 'opera-custom';

        config.get = function(name) {
          if (name === 'browser_exes') {
            return {
              Opera: customExe
            };
          }
        };

        browsers = knownBrowsers('any', config);
        opera = findBrowser(browsers, 'Opera');

        expect(opera.possibleExe).to.be.a('string');
        expect(opera.possibleExe).to.equal(customExe);
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
      let browsers;
      let phantomJS;
      let scriptPath;

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

      it('allows a custom path to be used as the possiblePath for phantomjs ', function() {
        let customPath = '/my/custom/path/to/phantomjs';

        config.get = function(name) {
          if (name === 'browser_paths') {
            return {
              PhantomJS: customPath
            };
          }
        };

        browsers = knownBrowsers('any', config);
        phantomJS = findBrowser(browsers, 'PhantomJS');

        expect(phantomJS.possiblePath).to.be.a('string');
        expect(phantomJS.possiblePath).to.equal(customPath);
      });

      it('allows a custom exe to be used as the possibleExe for phantomjs ', function() {
        let customExe = 'phantomjs-custom';

        config.get = function(name) {
          if (name === 'browser_exes') {
            return {
              PhantomJS: customExe
            };
          }
        };

        browsers = knownBrowsers('any', config);
        phantomJS = findBrowser(browsers, 'PhantomJS');

        expect(phantomJS.possibleExe).to.be.a('string');
        expect(phantomJS.possibleExe).to.equal(customExe);
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
          let customScriptPath = './custom_phantom.js';

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
      let browsers;
      let internetExplorer;

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

      it('allows a custom path to be used as the possiblePath for IE ', function() {
        let customPath = 'c:\\my\\custom\\path\\to\\IE';

        config.get = function(name) {
          if (name === 'browser_paths') {
            return {
              IE: customPath
            };
          }
        };

        browsers = knownBrowsers('win32', config);
        internetExplorer = findBrowser(browsers, 'IE');

        expect(internetExplorer.possiblePath).to.be.a('string');
        expect(internetExplorer.possiblePath).to.equal(customPath);
      });

      it('allows a custom exe to be used as the possibleExe for IE ', function() {
        let customExe = 'iexplore-custom.exe';

        config.get = function(name) {
          if (name === 'browser_exes') {
            return {
              IE: customExe
            };
          }
        };

        browsers = knownBrowsers('win32', config);
        internetExplorer = findBrowser(browsers, 'IE');

        expect(internetExplorer.possibleExe).to.be.a('string');
        expect(internetExplorer.possibleExe).to.equal(customExe);
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
