var expect = require('chai').expect
var Config = require('../lib/config')
var DevApp = require('../lib/dev')
var sinon = require('sinon')
var fireworm = require('fireworm')

var isWin = /^win/.test(process.platform)

describe('Dev', !isWin ? function(){
  var app, config, sandbox

  beforeEach(function() {
    sandbox = sinon.sandbox.create()
  })

  afterEach(function() {
    sandbox.restore()
  })

  describe('pause running', function() {
    beforeEach(function() {
      config = new Config('dev')
      sandbox.stub(DevApp.prototype, 'configureView')
      sandbox.stub(DevApp.prototype, 'configure')
      app = new DevApp(config, function(){})
      app.view = {
        clearErrorPopupMessage: function(){}
      }
    })

    afterEach(function(done) {
      app.quit(0, null, done)
    })

    it("starts off not paused", function(){
      expect(app.paused).to.be.false
    })

    it("doesn't run tests when reset and paused", function() {
      app.paused = true
      var cb = sandbox.spy()
      app.startTests(cb)
      expect(cb.called).to.be.false
    })

    it("runs tests when reset and not paused", function() {
      var cb = sandbox.spy()
      app.startTests(cb)
      expect(cb.called).to.be.true
    })
  })

  describe('file watching', function() {
    beforeEach(function() {
      sandbox.stub(DevApp.prototype, 'configureView')
      sandbox.stub(Config.prototype, 'readConfigFile', function(file, cb) {
        cb();
      })
    })

    it('adds a watch', function(done) {
      var add = sandbox.spy(fireworm.prototype, 'add');
      var srcFiles = ['test.js'];
      config = new Config('dev', {}, { src_files: srcFiles })
      app = new DevApp(config, done, function() {
        expect(add.getCall(0).args[0]).to.eq(srcFiles);
        app.quit();
      })
      app.view = {
        clearErrorPopupMessage: function(){}
      }
    })

    it('creates no watcher', function(done) {
      config = new Config('dev', {}, {
        src_files: ['test.js'],
        disable_watching: true
      })
      app = new DevApp(config, done, function() {
        expect(app.fileWatcher).to.eq(undefined);
        app.quit();
      })
      app.view = {
        clearErrorPopupMessage: function(){}
      }
    })
  })

}: function() {
  xit('TODO: Fix and re-enable for windows')
})
