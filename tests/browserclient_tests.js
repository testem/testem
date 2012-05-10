var BrowserClient = require('../lib/browserclient.js')
  , test = require('./testutils.js')
  , EventEmitter = require('events').EventEmitter
  , expect = test.expect

describe('BrowserClient', function(){
    var socket, app, client
    beforeEach(function(){
        socket = new EventEmitter
        app = {
            server: {
                emit: test.spy(),
                cleanUpConnections: test.spy()
            }
        }
        client = new BrowserClient(socket, app)
    })
    it('can create', function(){
        expect(client.client).to.equal(socket)
        expect(client.app).to.equal(app)
    })
    it('emits server browsers-changed when browser-login', function(){
        socket.emit('browser-login')
        expect(app.server.emit.calledWith('browsers-changed')).to.equal(true)
    })
})