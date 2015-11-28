'use strict';

function FakeReporter() {
  this.results = [];
  this.total = 0;
  this.pass = 0;
}

FakeReporter.prototype.report = function(prefix, result) {
  if (result.passed) {
    this.pass++;
  }
  this.total++;
  this.results.push({ result: result });
};
FakeReporter.prototype.finish = function() {};

module.exports = FakeReporter;
