const { test } = require('node:test');
const assert = require('node:assert/strict');
const hello = require('./hello');

test('it says hello world', () => {
  assert.equal(hello(), 'hello world');
});

test('it says hello to person', () => {
  assert.equal(hello('Bob'), 'hello Bob');
});
