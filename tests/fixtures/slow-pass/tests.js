/* globals QUnit */
'use strict';

QUnit.test('says hello world', function(assert) {
  var done = assert.async();
  setTimeout(function() {
    done();
  }, 30000);
});
