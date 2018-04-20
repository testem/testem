'use strict';

var Bluebird = require('bluebird');
var expect = require('chai').expect;
var EventEmitter = require('events').EventEmitter;

var SignalListeners = require('../../lib/utils/signal-listeners');

var isNodeLt400 = require('../support/is-node-lt-400');

describe('SignalListeners', function() {
  describe('with', function() {
    it('adds and removes listeners for SIGINT and SIGTERM', function() {
      var intCount = listenerCount(process, 'SIGINT');
      var termCount = listenerCount(process, 'SIGTERM');

      return Bluebird.using(SignalListeners.with(), function() {
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
