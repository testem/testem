'use strict';

var displayutils = require('../displayutils');
var XmlDom = require('xmldom');

function XUnitReporter(silent, out, config) {
  this.out = out || process.stdout;
  this.printIntermediateOutput = config.get('xunit_intermediate_output');
  this.excludeStackTraces = config.get('xunit_exclude_stack');
  this.silent = silent;
  this.stoppedOnError = null;
  this.id = 1;
  this.total = 0;
  this.pass = 0;
  this.skipped = 0;
  this.results = [];
  this.startTime = new Date();
  this.endTime = null;
}
XUnitReporter.prototype = {
  report: function(prefix, data) {
    this.results.push({
      launcher: prefix,
      result: data
    });
    this.display(prefix, data);
    this.total++;
    if (data.skipped) {
      this.skipped++;
    } else if (data.passed) {
      this.pass++;
    }
  },
  finish: function() {
    if (this.silent) {
      return;
    }
    this.endTime = new Date();
    if (this.printIntermediateOutput) {
      this.out.write('Disabled XML to stdout when intermediate output is set');
    } else {
      this.out.write(this.summaryDisplay());
      this.out.write('\n');
    }
  },
  summaryDisplay: function() {
    var doc = new XmlDom.DOMImplementation().createDocument('', 'testsuite');

    var rootNode = doc.documentElement;
    rootNode.setAttribute('name', 'Testem Tests');
    rootNode.setAttribute('tests', this.total);
    rootNode.setAttribute('skipped', this.skipped);
    rootNode.setAttribute('failures', this.failures());
    rootNode.setAttribute('timestamp', new Date());
    rootNode.setAttribute('time', this.duration());

    for (var i = 0, len = this.results.length; i < len; i++) {
      var testcaseNode = this.getTestResultNode(doc, this.results[i]);
      rootNode.appendChild(testcaseNode);
    }
    return doc.documentElement.toString();
  },
  display: function(prefix, result) {
    if (this.silent || !this.printIntermediateOutput || this.out === process.stdout) {
      return;
    }
    process.stdout.write(displayutils.resultString(this.id++, prefix, result));
  },
  getTestResultNode: function(document, result) {
    var launcher = result.launcher;
    result = result.result;

    var resultNode = document.createElement('testcase');
    resultNode.setAttribute('classname', launcher);
    resultNode.setAttribute('name', result.name);
    resultNode.setAttribute('time', this._durationFromMs(result.runDuration));

    var error = result.error;
    if (error) {
      var errorNode = document.createElement('error');
      errorNode.setAttribute('message', error.message);
      if (error.stack && !this.excludeStackTraces) {
        var cdata = document.createCDATASection(error.stack);
        errorNode.appendChild(cdata);
      }
      resultNode.appendChild(errorNode);
    } else if (result.skipped) {
      var skippedNode = document.createElement('skipped');
      resultNode.appendChild(skippedNode);
    } else if (!result.passed) {
      var failureNode = document.createElement('failure');
      resultNode.appendChild(failureNode);
    }

    return resultNode;
  },
  failures: function() {
    return this.total - this.pass - this.skipped;
  },
  duration: function() {
    return this._durationFromMs(this.endTime - this.startTime);
  },
  _durationFromMs: function(ms) {
    if (ms)
    {
      return (ms / 1000).toFixed(3);
    } else
    {
      return 0;
    }
  }
};

module.exports = XUnitReporter;
