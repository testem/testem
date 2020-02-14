/* globals QUnit */
'use strict';

QUnit.todo('failing todo', function(assert) {
  assert.ok(false, 'should be true');
});

QUnit.todo('passing todo', function(assert) {
  assert.ok(true, 'should be true');
});
