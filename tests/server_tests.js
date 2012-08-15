var Server = require('../lib/server.js')
  , test = require('./testutils.js')
  , EventEmitter = require('events').EventEmitter
  , Backbone = require('backbone')
  , expect = test.expect

describe('Server', function(){
	var server, runners, app, socketClient
	beforeEach(function(){
		runners = new Backbone.Collection
		app = {config: {}, runners: runners}
		server = new Server(app)
		socketClient = new EventEmitter
	})
	it('fires event when new browser connects', function(){
		var onAdd = test.spy()
		runners.on('add', onAdd)
		server.onClientConnected(socketClient)
		expect(runners.length).to.equal(1)
		expect(onAdd.callCount).to.equal(1)
	})
	it('fires event when removing a browser', function(){
		server.onClientConnected(socketClient)
		var runner = runners.at(0)
		var onRemove = test.spy()
		runners.on('remove', onRemove)
		server.removeBrowser(runner)
		expect(onRemove.callCount).to.equal(1)
	})
})