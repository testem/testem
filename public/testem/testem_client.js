/*

testem_client.js
================

The client-side script that reports results back to the Testem server via Socket.IO.
It also restarts the tests by refreshing the page when instructed by the server to do so.

*/
/* globals document, window */
/* globals jasmineAdapter, jasmine2Adapter, mochaAdapter */
/* globals qunitAdapter, busterAdapter, decycle */
/* globals Testem */
/* exported Testem */

var iframe;
(function appendTestemIframeOnLoad() {
  var iframeAppended = false;

  var appendIframe = function() {
    if (iframeAppended) {
      return;
    }
    iframeAppended = true;
    iframe = document.createElement('iframe');
    iframe.style.border = 'none';
    iframe.style.position = 'fixed';
    iframe.style.right = '5px';
    iframe.style.bottom = '5px';
    iframe.frameBorder = '0';
    iframe.allowTransparency = 'true';
    iframe.src = '/testem/connection.html';
    document.body.appendChild(iframe);
  };

  var domReady = function() {
    if (!document.body) {
      return setTimeout(domReady, 1);
    }
    appendIframe();
  };

  var DOMContentLoaded = function() {
    if (document.addEventListener) {
      document.removeEventListener('DOMContentLoaded', DOMContentLoaded, false);
    } else {
      document.detachEvent('onreadystatechange', DOMContentLoaded);
    }
    domReady();
  };

  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', DOMContentLoaded, false);
    window.addEventListener('load', DOMContentLoaded, false);
  } else if (document.attachEvent) {
    document.attachEvent('onreadystatechange', DOMContentLoaded);
    window.attachEvent('onload', DOMContentLoaded);
  }

  if (document.readyState !== 'loading') {
    domReady();
  }
})();

var testFrameworkDidInit = false;
function hookIntoTestFramework(socket) {
  if (testFrameworkDidInit) {
    return;
  }

  var found = true;
  if (typeof getJasmineRequireObj === 'function') {
    jasmine2Adapter(socket);
  } else if (typeof jasmine === 'object') {
    jasmineAdapter(socket);
  } else if (typeof Mocha === 'function') {
    mochaAdapter(socket);
  } else if (typeof QUnit === 'object') {
    qunitAdapter(socket);
  } else if (typeof buster !== 'undefined') {
    busterAdapter(socket);
  } else {
    found = false;
  }

  testFrameworkDidInit = found;
  return found;
}

function init() {
  interceptWindowOnError();
  takeOverConsole();
  setupTestStats();
  Testem.hookIntoTestFramework = function() {
    if (!hookIntoTestFramework(Testem)) {
      throw new Error('Testem was unable to detect a test framework, please load it before invoking Testem.hookIntoTestFramework');
    }
  };
  hookIntoTestFramework(Testem);
}

function setupTestStats() {
  var originalTitle = document.title;
  var total = 0;
  var passed = 0;
  Testem.on('test-result', function(test) {
    total++;
    if (test.failed === 0) {
      passed++;
    }
    updateTitle();
  });

  function updateTitle() {
    if (!total) {
      return;
    }
    document.title = originalTitle + ' (' + passed + '/' + total + ')';
  }
}

function takeOverConsole() {
  function intercept(method) {
    var original = console[method];
    console[method] = function() {
      var doDefault, message;
      var args = Array.prototype.slice.apply(arguments);
      if (Testem.handleConsoleMessage) {
        message = decycle(args).join(' ');
        doDefault = Testem.handleConsoleMessage(message);
      }
      if (doDefault !== false) {
        args.unshift(method);
        emit.apply(console, args);
        if (original && original.apply) {
          // Do this for normal browsers
          original.apply(console, arguments);
        } else if (original) {
          // Do this for IE
          if (!message) {
            message = decycle(args).join(' ');
          }
          original(message);
        }
      }
    };
  }
  var methods = ['log', 'warn', 'error', 'info'];
  for (var i = 0; i < methods.length; i++) {
    if (window.console && console[methods[i]]) {
      intercept(methods[i]);
    }
  }
}

function interceptWindowOnError() {
  var orginalOnError = window.onerror;
  window.onerror = function(msg, url, line) {
    if (typeof msg === 'string' && typeof url === 'string' && typeof line === 'number') {
      emit('top-level-error', msg, url, line);
    }
    if (orginalOnError) {
      orginalOnError.apply(window, arguments);
    }
  };
}

function emit() {
  Testem.emit.apply(Testem, arguments);
}

var addListener = window.addEventListener ?
  function(obj, evt, cb) { obj.addEventListener(evt, cb, false); } :
  function(obj, evt, cb) { obj.attachEvent('on' + evt, cb); };

function serializeMessage(message) {
  // decycle to remove possible cyclic references
  // stringify for clients that only can handle string postMessages (IE <= 10)
  return JSON.stringify(decycle(message));
}

function deserializeMessage(message) {
  return JSON.parse(message);
}

addListener(window, 'message', receiveMessage);
function receiveMessage(event) {
  if (event.source !== iframe.contentWindow) {
    // ignore messages not from the iframe
    return;
  }

  var message = deserializeMessage(event.data);
  var type = message.type;

  switch (type) {
    case 'reload':
      window.location.reload();
      break;
    case 'get-id':
      sendMessageToIframe('get-id', Testem.getId());
      break;
    case 'no-connection-required':
      Testem.noConnectionRequired();
      break;
    case 'iframe-ready':
      Testem.iframeReady();
      break;
  }
}

function sendMessageToIframe(type, data) {
  var message = {type: type};
  if (data) {
    message.data = data;
  }
  message = serializeMessage(message);
  iframe.contentWindow.postMessage(message, '*');
}

window.Testem = {
  // set during init
  initTestFrameworkHooks: undefined,
  emitMessageQueue: [],
  useCustomAdapter: function(adapter) {
    adapter(this);
  },
  getId: function() {
    var match = window.location.pathname.match(/^\/(-?[0-9]+)/);
    return match ? match[1] : null;
  },
  emitMessage: function() {
    if (this._noConnectionRequired) {
      return;
    }
    var args = Array.prototype.slice.call(arguments);

    if (this._isIframeReady) {
      this.emitMessageToIframe(args);
    } else {
      // enqueue until iframe is ready
      this.enqueueMessage(args);
    }
  },
  emit: function(evt) {
    var argsWithoutFirst = Array.prototype.slice.call(arguments, 1);

    if (this.evtHandlers && this.evtHandlers[evt]) {
      var handlers = this.evtHandlers[evt];
      for (var i = 0; i < handlers.length; i++) {
        var handler = handlers[i];
        handler.apply(this, argsWithoutFirst);
      }
    }
    this.emitMessage.apply(this, arguments);
  },
  on: function(evt, callback) {
    if (!this.evtHandlers) {
      this.evtHandlers = {};
    }
    if (!this.evtHandlers[evt]) {
      this.evtHandlers[evt] = [];
    }
    this.evtHandlers[evt].push(callback);
  },
  handleConsoleMessage: null,
  noConnectionRequired: function() {
    this._noConnectionRequired = true;
    this.emitMessageQueue = [];
  },
  emitMessageToIframe: function(item) {
    sendMessageToIframe('emit-message', item);
  },
  enqueueMessage: function(item) {
    if (this._noConnectionRequired) {
      return;
    }
    this.emitMessageQueue.push(item);
  },
  iframeReady: function() {
    this.drainMessageQueue();
    this._isIframeReady = true;
  },
  drainMessageQueue: function() {
    while (this.emitMessageQueue.length) {
      var item = this.emitMessageQueue.shift();
      this.emitMessageToIframe(item);
    }
  }
};

init();
