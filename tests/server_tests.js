var Server = require('../lib/server.js')
  , test = require('./testutils.js')
  , EventEmitter = require('events').EventEmitter
  , expect = test.expect

describe('Server', function(){
	var server, browsers, app, socketClient
	beforeEach(function(){
		app = {config: {}}
		server = new Server(app)
		browsers = server.browsers
		socketClient = new EventEmitter
	})
	it('fires event when new browser connects', function(){
		var onAdd = test.spy()
		browsers.on('add', onAdd)
		server.onClientConnected(socketClient)
		expect(browsers.length).to.equal(1)
		expect(onAdd.callCount).to.equal(1)
	})
	it('fires event when removing a browser', function(){
		server.onClientConnected(socketClient)
		var browser = browsers.at(0)
		var onRemove = test.spy()
		browsers.on('remove', onRemove)
		server.removeBrowser(browser)
		expect(onRemove.callCount).to.equal(1)
	})
})