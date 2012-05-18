var BrowserClient = require('../lib/browserclient.js')
  , test = require('./testutils.js')
  , EventEmitter = require('events').EventEmitter
  , expect = test.expect

describe('BrowserClient', function(){
    var socket, app, client, server
    beforeEach(function(){
        socket = new EventEmitter
        server = {
            emit: test.spy()
            , cleanUpConnections: test.spy()
            , removeBrowser: test.spy()
        }
        app = {
            server: server
        }
        client = new BrowserClient(socket, app)
    })
    it('can create', function(){
        expect(client.client).to.equal(socket)
        expect(client.app).to.equal(app)
    })
    it('triggers change:name when browser-login', function(){
        var onChange = test.spy()
        client.on('change:name', onChange)
        socket.emit('browser-login', 'PhantomJS 1.9')
        expect(onChange.callCount).to.equal(1)
    })
    describe('reset Test Results', function(){
        it('resets topLevelError', function(){
            client.results.set('topLevelError', 'blah')
            client.results.reset()
            expect(client.results.topLevelError).to.equal(null)
        })
        it('resets results', function(){
            client.results.addResult({
                failed: false
                , passed: true
            })
            client.results.reset()
            expect(client.results.total).to.equal(0)
            expect(client.results.passed).to.equal(0)
        })
    })
    it('emits start-tests and resets when startTests', function(){
        test.spy(client.results, 'reset')
        test.spy(socket, 'emit')
        client.startTests()
        expect(client.results.reset.callCount).to.equal(1)
        expect(socket.emit.calledWith('start-tests')).to.be.ok
        client.results.reset.restore()
        socket.emit.restore()
    })
    it('sets topLevelError when error emitted', function(){
        socket.emit('error', 'TypeError: bad news', 'http://test.com/bad.js', 45)
        expect(client.topLevelError).to.equal('TypeError: bad news at http://test.com/bad.js, line 45')
    })
    describe('login', function(){
        beforeEach(function(){
            socket.emit('browser-login', 'IE 11.0')
        })
        it('sets browser name', function(){
            expect(client.name).to.equal('IE 11.0')
        })
    })
    it('emits test-start on server on tests-start', function(){
        socket.emit('tests-start')
        expect(server.emit.calledWith('test-start')).to.be.ok
    })
    it('updates results on test-result', function(){
        socket.emit('test-result', {failed: 1})
        expect(client.results.passed).to.equal(0)
        expect(client.results.failed).to.equal(1)
        socket.emit('test-result', {failed: 0})
        expect(client.results.passed).to.equal(1)
        expect(client.results.tests.length).to.equal(2)
    })
    it('sets "all" on all-tests-results', function(){
        socket.emit('all-test-results')
        expect(client.results.all).to.be.ok
    })
    it('emits all-test-results on server on all-tests-results', function(){
        socket.emit('all-test-results')
        expect(server.emit.calledWith('all-test-results', client.results, client))
            .to.be.ok
    })
    it('removes self from server if disconnect', function(){
        socket.emit('disconnect')
        expect(server.removeBrowser.calledWith(client))
    })
})