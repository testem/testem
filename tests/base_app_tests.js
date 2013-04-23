var BaseApp = require('../lib/base_app')
var expect = require('./testutils.js').expect
var assert = require('chai').assert
var spy = require('sinon').spy
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

  it('initializes url to configured host', function(){
    config = new Config('dev', {host: 'blah.com', port: 3000})
    app = new BaseApp(config)
    assert.equal(app.url, 'http://blah.com:3000')
  })
})
