'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var Testem = require('../public/testem/testem_client');

describe('Testem Client', function() {

  it('passes new socket to each custom adapter', function() {
    var socket1, socket2;

    Testem.useCustomAdapter(function(socket) {
      socket1 = socket;
    });

    Testem.useCustomAdapter(function(socket) {
      socket2 = socket;
    });

    expect(socket1).to.not.equal(socket2);
  });

  it('emits message with custom decycle depth to iframe', function() {
    var eventMaxDepth = 10;

    global.decycle = sinon.spy();

    Testem._isIframeReady = true;

    Testem.useCustomAdapter(function(socket) {
      socket.iframe = {
        contentWindow: {
          postMessage: function() {}
        }
      };

      socket.eventMaxDepth = eventMaxDepth;
      socket.emitMessage();
    });

    sinon.assert.calledWithExactly(global.decycle, sinon.match.any, eventMaxDepth);
  });

  it('drains message with custom decycle depth from queue', function() {
    var eventMaxDepth = 10;

    global.decycle = sinon.spy();

    Testem.emitMessageQueue = [];
    Testem._isIframeReady = false;

    Testem.useCustomAdapter(function(socket) {
      socket.iframe = {
        contentWindow: {
          postMessage: function() {}
        }
      };

      socket.eventMaxDepth = eventMaxDepth;
      socket.emitMessage();
    });

    expect(Testem.emitMessageQueue).to.not.be.empty();

    Testem.drainMessageQueue();

    sinon.assert.calledWithExactly(global.decycle, sinon.match.any, eventMaxDepth);
  });
});
