import { test, expect } from 'vitest';
import { hello } from './hello.js';

test('it says hello world', () => {
  expect(hello()).toBe('hello world');
});

test('it says hello to person', () => {
  expect(hello('Bob')).toBe('hello Bob');
});
