'use strict';

var EventEmitter = require('events').EventEmitter;

class FakeServer {
  set() {}
}

/**
 * A mock for a socket from socket.io
 */

function FakeSocket() {
  this.server = new FakeServer();
}

/**
 * Inherits from `EventEmitter`.
 */

FakeSocket.prototype.__proto__ = EventEmitter.prototype;

module.exports = FakeSocket;
