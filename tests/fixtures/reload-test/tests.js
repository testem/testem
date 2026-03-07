/* globals QUnit, window */


QUnit.test('says hello world', function(assert) {
  assert.ok(true);
});

QUnit.done(function() {
  setTimeout(function() {
    window.location.reload();
  }, 500);
});
