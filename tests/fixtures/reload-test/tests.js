/* globals QUnit, window */
'use strict';

QUnit.test('says hello world', function(assert) {
  assert.ok(true);
});

QUnit.done(function() {
  setTimeout(function() {
    window.location.reload();
  }, 500);
});
