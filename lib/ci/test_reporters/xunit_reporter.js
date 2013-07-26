var strutils = require('../../strutils')

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
  start: function() {
    if (this.silent) return
    this.out.write('<?xml version="1.0" encoding="UTF-8"?>\n')
  },
  report: function(prefix, data){
    this.results.push({
      launcher: prefix,
      result: data
    })
    this.total++
    if (data.passed) this.pass++
  },
  finish: function(){
    if (this.silent) return
    this.endTime = new Date()
    this.out.write('\n\n')
    this.out.write(this.summaryDisplay())
    this.out.write('\n\n')
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
    if (error){
      return '  <testcase name="' +
        launcher + ' ' + result.name + '">' +
        '<failure name="' + result.name + '" ' +
        'message="' + error.message + '">' +
        (!error.stack ? '' : '<![CDATA[' + error.stack + ']]') +
        '</failure></testcase>'
    }else{
      return '  <testcase name="' +
        launcher + ' ' + result.name + '"/>'
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
