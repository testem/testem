import { expect } from "chai";
import { EventEmitter } from "node:events";
import SignalListeners from "../../lib/utils/signal-listeners.js";
import isNodeLt400 from "../support/is-node-lt-400.js";

describe('SignalListeners', function() {
  describe('with', function() {
    it('adds and removes listeners for SIGINT and SIGTERM', function() {
      var intCount = listenerCount(process, 'SIGINT');
      var termCount = listenerCount(process, 'SIGTERM');

      return SignalListeners.with(function() {
        expect(listenerCount(process, 'SIGINT')).to.eq(intCount + 1);
        expect(listenerCount(process, 'SIGTERM')).to.eq(termCount + 1);
      }).then(function() {
        expect(listenerCount(process, 'SIGINT')).to.eq(intCount);
        expect(listenerCount(process, 'SIGTERM')).to.eq(termCount);
      });
    });
  });
});

function listenerCount(emitter, signal) {
  if (isNodeLt400()) {
    return EventEmitter.listenerCount(emitter, signal);
  }

  return emitter.listenerCount(signal);
}
