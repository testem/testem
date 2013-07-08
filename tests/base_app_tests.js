var BaseApp = require('../lib/base_app')
var expect = require('./testutils.js').expect
var assert = require('chai').assert
var Model = require('backbone').Model
var Config = require('../lib/config')

describe('BaseApp', function(){
  var app, config, runner1, runner2

  beforeEach(function(){
    config = new Config()
    config.config = {port: 3000}
    app = new BaseApp(config)

    runner1 = new Model({ results: new Model({ all: false }) })
    runner2 = new Model({ results: new Model({ all: false }) })

    app.runners.add([runner1, runner2])
  })

})
