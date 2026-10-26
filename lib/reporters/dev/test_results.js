import Backbone from "backbone";

var TestResults = Backbone.Model.extend({
  initialize: function() {
    this.reset();
  },
  reset: function() {
    this.set({
      topLevelError: null,
      failed: 0,
      passed: 0,
      pending: 0,
      total: 0,
      // How many tests the framework announced it will run, or 0 if unknown.
      // Only used for progress display; `total` stays the count of results.
      planned: 0,
      tests: new Backbone.Collection(),
      all: false
    });
  },
  addResult: function(result) {
    var total = this.get('total');
    var pending = this.get('pending');
    var passed = this.get('passed');
    var failed = this.get('failed');
    total++;
    if (result.pending) {
      pending++;
    } else if ((result.failed === 0 && !result.todo) || (result.failed > 0 && result.todo)) {
      passed++;
    } else {
      failed++;
    }
    this.get('tests').push(result);
    this.set({
      total: total,
      pending: pending,
      passed: passed,
      failed: failed,
      items: result.items
    });
  }
});

export default TestResults