var Backbone = require('backbone')
var expect = require('chai').expect
var Config = require('../lib/config')
var DevApp = require('../lib/dev')
var sinon = require('sinon')

describe('Dev', function(){
  var app, config, spy

  beforeEach(function(){
    config = new Config('dev')
    sinon.stub(DevApp.prototype, "configureView")
    sinon.stub(DevApp.prototype, "configure")
    app = new DevApp(config, function(){})
    app.view = {
      clearErrorPopupMessage: function(){}
    }
  })

  afterEach(function(){
    DevApp.prototype.configureView.restore()
    DevApp.prototype.configure.restore()
  })

  it("starts off not paused", function(){
    expect(app.paused).to.be.false
  })

  it("doesn't run tests when reset and paused", function() {
    app.paused = true
    cb = sinon.spy()
    app.startTests(cb)
    expect(cb.called).to.be.false
  })

  it("runs tests when reset and not paused", function() {
    cb = sinon.spy()
    app.startTests(cb)
    expect(cb.called).to.be.true
  })
})
