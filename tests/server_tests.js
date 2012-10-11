var Server = require('../lib/server.js')
var test = require('./testutils.js')
var EventEmitter = require('events').EventEmitter
var Backbone = require('backbone')
var expect = test.expect

describe('Server', function(){
	var server, runners, app, socketClient
	var orgSetTimeout
	beforeEach(function(){
		runners = new Backbone.Collection
		app = {config: {}, runners: runners, removeBrowser: function(){}}
		server = new Server(app)
		socketClient = new EventEmitter
	})
})