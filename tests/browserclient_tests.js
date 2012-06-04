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
            var results = client.get('results')
            results.set('topLevelError', 'blah')
            results.reset()
            expect(results.get('topLevelError')).to.equal(null)
        })
        it('resets results', function(){
            var results = client.get('results')
            results.addResult({
                failed: false
                , passed: true
            })
            results.reset()
            expect(results.get('total')).to.equal(0)
            expect(results.get('passed')).to.equal(0)
        })
    })
    it('emits start-tests and resets when startTests', function(){
        var results = client.get('results')
        test.spy(results, 'reset')
        test.spy(socket, 'emit')
        client.startTests()
        expect(results.reset.callCount).to.equal(1)
        expect(socket.emit.calledWith('start-tests')).to.be.ok
        results.reset.restore()
        socket.emit.restore()
    })
    it('sets topLevelError when error emitted', function(){
        socket.emit('error', 'TypeError: bad news', 'http://test.com/bad.js', 45)
        expect(client.get('results').get('topLevelError')).to.equal('TypeError: bad news at http://test.com/bad.js, line 45')
    })
    describe('login', function(){
        beforeEach(function(){
            socket.emit('browser-login', 'IE 11.0')
        })
        it('sets browser name', function(){
            expect(client.get('name')).to.equal('IE 11.0')
        })
    })
    it('emits tests-start on server on tests-start', function(){
        test.spy(client, 'trigger')
        socket.emit('tests-start')
        expect(client.trigger.calledWith('tests-start')).to.be.ok
        client.trigger.restore()
    })
    it('updates results on test-result', function(){
        var results = client.get('results')
        socket.emit('test-result', {failed: 1})
        expect(results.get('passed')).to.equal(0)
        expect(results.get('failed')).to.equal(1)
        socket.emit('test-result', {failed: 0})
        expect(results.get('passed')).to.equal(1)
        expect(results.get('tests').length).to.equal(2)
    })
    it('sets "all" on all-tests-results', function(){
        socket.emit('all-test-results')
        expect(client.get('results').get('all')).to.be.ok
    })
    it('emits all-test-results on server on all-tests-results', function(){
        socket.emit('all-test-results')
        expect(server.emit.calledWith('all-test-results', client.get('results'), client))
            .to.be.ok
    })
    it('removes self from server if disconnect', function(){
        socket.emit('disconnect')
        expect(server.removeBrowser.calledWith(client))
    })
})