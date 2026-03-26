/* globals Testem */


Testem.useCustomAdapter(tapAdapter);
function tapAdapter(socket) {

  // Report any errors that occurred before the socket was ready
  var preErrors = window.__capturedErrors || [];
  for (var ei = 0; ei < preErrors.length; ei++) {
    socket.emit('test-result', {
      passed: 0, failed: 1, total: 1, id: ei + 1,
      name: 'JS error (pre-socket): ' + preErrors[ei], items: []
    });
  }

  // Chain onto testem's onerror (which emits top-level-error for bail_on_uncaught_error)
  var prevOnerror = window.onerror;
  window.onerror = function(msg, src, line, col, err) {
    if (prevOnerror) { prevOnerror.apply(window, arguments); }
    return true;
  };

  window.addEventListener('unhandledrejection', function(ev) {
    var reason = ev.reason && ev.reason.message ? ev.reason.message : String(ev.reason);
    var stack = ev.reason && ev.reason.stack ? ' | stack: ' + ev.reason.stack : '';
    socket.emit('test-result', {
      passed: 0, failed: 1, total: 1, id: 998,
      name: 'Unhandled rejection: ' + reason + stack,
      items: []
    });
    socket.emit('all-test-results');
  });

  var results = {
    failed: 0,
    passed: 0,
    total: 0,
    tests: []
  };

  socket.emit('tests-start');

  Testem.handleConsoleMessage = function(msg) {
    socket.emit('tap-debug', { msg: msg });
    var m = msg.match(/^((?:not )?ok) (\d+) (.+)$/);
    if (m) {

      var passed = m[1] === 'ok';
      var test = {
        passed: passed ? 1 : 0,
        failed: passed ? 0 : 1,
        total: 1,
        id: m[2],
        name: m[3],
        items: []
      };

      if (passed) {
        results.passed++;
      } else {
        results.failed++;
      }
      results.total++;

      socket.emit('test-result', test);
      results.tests.push(test);
    } else if (msg === '# ok' || msg.match(/^# tests \d+/)) {
      socket.emit('all-test-results');
    }

  };

}
