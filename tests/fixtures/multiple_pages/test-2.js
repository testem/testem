QUnit.module('Test Page #2');

QUnit.test('should be true', function(assert) {
  assert.notEqual(window.location.pathname.indexOf('/test-2.html'), -1);
});
