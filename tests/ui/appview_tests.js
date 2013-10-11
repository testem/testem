var AppView = require('../../lib/dev/ui/appview')
var Backbone = require('backbone')
var Config = require('../../lib/config')
var screen = require('./fake_screen')
var assert = require('chai').assert

describe('AppView', function(){

  var appview, app, config

  beforeEach(function(){
    app = new Backbone.Model
    app.url = 'http://localhost:1234'
    config = app.config = new Config({}, {port: 1234})
    app.runners = new Backbone.Collection
    appview = new AppView({
      app: app
      , screen: screen
    })
    screen.$setSize(10, 10)
  })

  it('initializes', function(){
    appview.renderTop()
    appview.renderMiddle()
    appview.renderBottom()

  })

})