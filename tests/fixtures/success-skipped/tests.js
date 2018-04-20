/* globals QUnit, window */
'use strict';

QUnit.test('says hello world', function(assert) {
  assert.equal(window.hello(), 'hello world', 'should equal hello world');
});

QUnit.test('works without content', function(assert) {
  assert.expect(0);
});

QUnit.skip('says hello to person', function() {});
