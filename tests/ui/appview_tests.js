var AppView = require('../../lib/ui/appview')
var Backbone = require('backbone')
var screen = require('./fake_screen')

describe('AppView', function(){

  it('initializes', function(){
    var app = new Backbone.Model
    app.config = {get: function(){ return 1234 }}
    app.runners = new Backbone.Collection
    var appview = new AppView({
      app: app
      , screen: screen
    })
    appview.renderTop()
    appview.renderMiddle()
    appview.renderBottom()
  })

})