var strutils = require('../../strutils')
var xmlescape = require('xml-escape');


function XUnitReporter(silent, out){
  this.out = out || process.stdout
  this.silent = silent
  this.stoppedOnError = null
  this.id = 1
  this.total = 0
  this.pass = 0
  this.results = []
  this.startTime = new Date()
  this.endTime = null
}
XUnitReporter.prototype = {
  report: function(prefix, data){
    this.results.push({
      launcher: prefix,
      result: data
    })
    this.total++
    if (data.passed) this.pass++
  },
  finish: function(writeStream){
    if (this.silent) return
    this.endTime = new Date()
    this.out.write(this.summaryDisplay())
    this.out.write('\n')
    if(writeStream) {
      writeStream.write(this.summaryDisplay())
    }
  },
  summaryDisplay: function(){
    return '<testsuite name="Testem Tests" tests="' + this.total +
      '" failures="' + this.failures() + '" timestamp="' + new Date +
      '" time="' + this.duration() + '">\n' +
      this.results.map(function(result){
        return this.renderTestResult(result)
      }, this).join('\n') +
      '\n</testsuite>'
  },
  renderTestResult: function(result){
    var launcher = result.launcher
    result = result.result
    var error = result.error
    var testname = xmlescape(result.name);
    if (error){
      return '  <testcase name="' +
        launcher + ' ' + testname + '">' +
        '<failure name="' + testname + '" ' +
        'message="' + error.message + '">' +
        (!error.stack ? '' : '<![CDATA[' + error.stack + ']]>') +
        '</failure></testcase>'
    }else{
      return '  <testcase name="' +
        launcher + ' ' + testname + '"/>'
    }
  },
  failures: function(){
    return this.total - this.pass
  },
  duration: function(){
    return Math.round((this.endTime - this.startTime) / 1000)
  }
}



module.exports = XUnitReporter
