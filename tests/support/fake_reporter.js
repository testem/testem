'use strict';

function FakeReporter() {
  this.results = [];
  this.total = 0;
  this.pass = 0;
  this.skipped = 0;
}

FakeReporter.prototype.report = function(prefix, result) {
  if (result.passed) {
    this.pass++;
  }
  if (result.skipped) {
    this.skipped++;
  }
  this.total++;
  this.results.push({ result: result });
};
FakeReporter.prototype.finish = function() {};
FakeReporter.prototype.onStart = function() {};
FakeReporter.prototype.onEnd = function() {};
FakeReporter.prototype.reportMetadata = function() {};

module.exports = FakeReporter;
