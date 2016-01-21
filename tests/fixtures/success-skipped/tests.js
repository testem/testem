/* globals QUnit, window */
QUnit.test('says hello world', function(assert) {
  assert.equal(window.hello(), 'hello world', 'should equal hello world');
});

QUnit.skip('says hello to person', function() {});
