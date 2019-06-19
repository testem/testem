'use strict';

const patchEmitterForWildcard = require('../public/testem/testem_connection');
const expect = require('chai').expect;
const ServerIO = require('socket.io');
const ClientIO = require('socket.io-client');

describe('Testem Connection', function() {
  var serverIo, client;
  var globals = {};

  function replaceGlobals(newGlobals, originalGlobals) {
    for (let key in newGlobals) {
      originalGlobals[key] = global[key];
      global[key] = newGlobals[key];
    }
  }
  
  before(function() {
    serverIo = ServerIO();
    serverIo.listen(8000);
  
    replaceGlobals({
      io: ClientIO
    }, globals);

    serverIo.on('connection', function (socket) {
      socket.emit('foo', { bar: 'baz' })
    });
  });

  after(function() {
    serverIo.close();
    globals = {};
  });

  afterEach(function() {
    client.close();
  });
  
  it('patches emitter for wildcard', function(done) {
    client = ClientIO('http://localhost:8000');
    patchEmitterForWildcard(client);

    var eventNameArr = [];

    function check(eventName) {
      eventNameArr.push(eventName);
      if(eventNameArr.length === 2) {
        expect(eventNameArr).to.deep.equal(['*', 'foo']);
        done();
      }
    }

    client.on('*', function(event) {
      expect(event.data[0]).to.equal('foo');
      expect(event.data[1]).to.deep.equal({bar: 'baz'});
      check('*');
    });

    client.on('foo', function(data) {
      expect(data).to.deep.equal({bar: 'baz'});
      check('foo');
    });
  });
});