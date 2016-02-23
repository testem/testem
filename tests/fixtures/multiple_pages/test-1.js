QUnit.module('Test Page #1');

QUnit.test('should be true', function(assert) {
  assert.notEqual(window.location.pathname.indexOf('/test-1.html'), -1);
});
