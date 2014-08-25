var path = require('path')
var browserLauncher = require('../lib/browser_launcher')
var Launcher = require('../lib/launcher')
var Config = require('../lib/config')
var assert = require('chai').assert

describe('browser_launcher', function(){
  var originalPlatform = process.platform
  var browserMap = {}

  before(function(done) {
    process.platform = 'linux'
    browserLauncher.getAvailableBrowsers(function(foundBrowsers) {
        foundBrowsers.forEach(function(browser) {
            browserMap[browser.name] = browser
        })
        done()
    })
  })

  after(function() {
    process.platform = originalPlatform
  })

  describe('with phantomjs', function() {
      it('should have phantom.js path and url in args', function() {
        var config = new Config(null, {port: '7357', url: 'http://blah.com/'})
        var launcher = new Launcher('whatever', browserMap.PhantomJS, config)
        var args = launcher.getArgs()

        assert.equal(args[0], path.join(__dirname, '..', 'assets', 'phantom.js'))
        assert(args[1].match(/^http:\/\/blah\.com\/\d+$/), 'Url should match')
        assert.equal(args[2], '{}')
      })

      it('should include viewportSize in args', function() {
        var config = new Config(null, {phantomjs_viewport_size: {width: 1000, height: 800}})
        var launcher = new Launcher('whatever', browserMap.PhantomJS, config)
        var args = launcher.getArgs()

        assert.equal(args[2], '{"viewportSize":{"width":1000,"height":800}}')
      })

      it('should include debug port in args', function() {
        var config = new Config(null, {phantomjs_debug_port: 1234})
        var launcher = new Launcher('whatever', browserMap.PhantomJS, config)
        var args = launcher.getArgs()

        assert.equal(args[0], '--remote-debugger-port=1234')
        assert.equal(args[1], '--remote-debugger-autorun=true')
      })
  })
})
