/* globals QUnit, window */
QUnit.test('says hello world', function(assert) {
  var done = assert.async();
  setTimeout(function() {
    done();
  }, 30000);

  setTimeout(function() {
    window.location = 'http://google.de';
  }, 500);
});
