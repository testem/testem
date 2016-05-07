var AjaxCountingReporter = require('./ajax_counting_reporter');
var TapReporter = require('../../lib/reporters/tap_reporter');

function Reporter() {
  this._ajaxCountingReporter = new AjaxCountingReporter();
  this._tapReporter = new TapReporter();
}

Reporter.prototype = {
  reportMetadata: function(tag, metadata) {
    this._ajaxCountingReporter.reportMetadata(tag, metadata);
  },

  report: function(prefix, data) {
    this._ajaxCountingReporter.report(prefix, data);
    this._tapReporter.report(prefix, data);
  },

  finish: function() {
    this._ajaxCountingReporter.finish();
    this._tapReporter.finish();
  }
};

module.exports = {
  "framework": "qunit",
  "test_page": "test.html",
  "reporter": new Reporter()
};
