import { EventEmitter } from "node:events";

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

export default FakeSocket