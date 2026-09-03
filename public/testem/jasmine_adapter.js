/*

jasmine_adapter.js
==================

Testem's adapter for Jasmine. It works by adding a custom reporter.

*/

/* globals emit, jasmine, console */
/* exported jasmineAdapter */
'use strict';

function jasmineAdapter() {
  if (!jasmineAdapter._deprecationWarned) {
    jasmineAdapter._deprecationWarned = true;
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('Testem: the Jasmine 1.x adapter is deprecated and will be removed in the next version of Testem. Upgrade to Jasmine 2+ (jasmine-core) so Testem can use the jasmine2 adapter.');
    }
  }

  var results = {
    failed: 0,
    passed: 0,
    total: 0,
    tests: []
  };

  function JasmineAdapterReporter() {}
  JasmineAdapterReporter.prototype.reportRunnerStarting = function() {
    emit('tests-start');
  };

  JasmineAdapterReporter.prototype.reportSpecStarting = function(spec) {
    var currentTest = {
      name: spec.getFullName()
    };
    emit('tests-start', currentTest);
  };

  JasmineAdapterReporter.prototype.reportSpecResults = function(spec) {
    if (spec.results().skipped) {
      return;
    }
    var test = {
      passed: 0,
      failed: 0,
      total: 0,
      id: spec.id + 1,
      name: spec.getFullName(),
      items: []
    };

    var items = spec.results().getItems();

    for (var i = 0, len = items.length; i < len; i++) {
      var item = items[i];
      if (item.type === 'log') {
        continue;
      }
      var passed = item.passed();
      test.total++;
      if (passed) {
        test.passed++;
      } else {
        test.failed++;
      }
      test.items.push({
        passed: passed,
        message: item.message,
        stack: item.trace.stack ? item.trace.stack : undefined
      });
    }

    results.total++;
    if (test.failed > 0) {
      results.failed++;
    } else {
      results.passed++;
    }

    emit('test-result', test);
  };
  JasmineAdapterReporter.prototype.reportRunnerResults = function() {
    emit('all-test-results');
  };
  jasmine.getEnv().addReporter(new JasmineAdapterReporter());

}
