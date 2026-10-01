import patchEmitterForWildcard from "../public/testem/testem_connection.js";
import { expect } from "chai";
import { Server } from "socket.io";
import createClient from "socket.io-client";

describe('Testem Connection', function() {
  var server, client;
  var globals = {};

  function replaceGlobals(newGlobals, originalGlobals) {
    for (let key in newGlobals) {
      originalGlobals[key] = global[key];
      global[key] = newGlobals[key];
    }
  }

  before(function() {
    server = new Server();
    server.listen(8000);

    replaceGlobals({
      io: createClient
    }, globals);

    server.on('connection', function(socket) {
      socket.emit('foo', { bar: 'baz' });
    });
  });

  after(function() {
    server.close();
    globals = {};
  });

  afterEach(function() {
    client.close();
  });

  it('patches emitter for wildcard', function(done) {
    client = createClient('http://localhost:8000');
    patchEmitterForWildcard(client);

    var eventNameArr = [];

    function check(eventName) {
      eventNameArr.push(eventName);
      if (eventNameArr.length === 2) {
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
