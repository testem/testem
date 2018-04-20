'use strict';

var test = require('tape');
var hello = require('./hello');

test('hello says hello', function(t) {
  t.plan(1);
  t.equal(hello(), 'hello world', 'hello() should be "hello world"');
});

test('hello says hello to bob', function(t) {
  t.plan(1);
  t.equal(hello('bob'), 'hello bob', 'hello(bob) should be "hello bob"');
});
