/* globals QUnit, console */
'use strict';

QUnit.test('says hello world', function(assert) {
  var done = assert.async();
  assert.expect(0);

  console.log('log - test');
  console.warn('warn - test');
  console.error('error - test');
  console.info('info - test');

  done();
});
