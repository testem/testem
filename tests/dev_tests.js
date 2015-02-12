var Backbone = require('backbone')
var expect = require('chai').expect
var Config = require('../lib/config')
var DevApp = require('../lib/dev')
var sinon = require('sinon')

var isWin = /^win/.test(process.platform)

describe('Dev', !isWin ? function(){
  var app, config, sandbox

  beforeEach(function(){
    config = new Config('dev')
    sandbox = sinon.sandbox.create()
    sandbox.stub(DevApp.prototype, "configureView")
    sandbox.stub(DevApp.prototype, "configure")
    app = new DevApp(config, function(){})
    app.view = {
      clearErrorPopupMessage: function(){}
    }
  })

  afterEach(function(){
    sandbox.restore()
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
}: function() {
  xit('TODO: Fix and re-enable for windows')
})
