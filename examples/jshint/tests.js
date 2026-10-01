/*global QUnit:true, hello:true */
/*jshint globalstrict: true*/
'use strict';

QUnit.test('say hello world', function(assert) {
  assert.equal(hello(), 'hello world', 'should equal hello world');
});

QUnit.test('say hello to person', function(assert) {
  assert.equal(hello('Bob'), 'hello Bob', 'should equal hello Bob');
});
