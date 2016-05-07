var jQuery = { ajax: function() { /* make an ajax call */ } };

QUnit.module('Module', function(hooks) {
  hooks.beforeEach(function() {
    this.ajaxCallCounter = new CallCounter(jQuery.ajax);

    this.originalAjax = jQuery.ajax;
    jQuery.ajax = this.ajaxCallCounter.wrap();
  });

  hooks.afterEach(function() {
    jQuery.ajax = this.originalAjax;
  });

  QUnit.test('Test 1', function(assert) {
    assert.expect(0);
    jQuery.ajax();
  });

  QUnit.test('Test 2', function(assert) {
    assert.expect(0);
    jQuery.ajax();
    jQuery.ajax();
  });
});

function CallCounter(fn) {
  this.count = 0;
  this.originalFunction = fn;
}

CallCounter.prototype.wrap = function() {
  var self = this;
  return function() {
    self.count++;
    return self.originalFunction.apply(this, arguments);
  }
};
