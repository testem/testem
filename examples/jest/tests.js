var hello = require('./hello');

describe('hello', function() {
  it('says hello world', function() {
    expect(hello()).toBe('hello world');
  });
  it('says hello to person', function() {
    expect(hello('Bob')).toBe('hello Bob');
  });
});
