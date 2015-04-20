var strutils = require('../../strutils')

function TeamcityReporter(silent, out){
  this.out = out || process.stdout
  this.silent = silent
  this.stoppedOnError = null
  this.id = 1
  this.total = 0
  this.pass = 0
  this.startTime = new Date()
  this.endTime = null
}
TeamcityReporter.prototype = {
  report: function(prefix, data){
    this.out.write('##teamcity[testStarted name="' + escape(data.name.trim()) + '"]\n');
    this.display(prefix, data)
    this.total++
    if (data.passed) this.pass++
  },

  display: function(prefix, result){
    if (this.silent) return
    if (!result.passed) {
      this.out.write('##teamcity[testFailed name="' + escape(result.name.trim()) + '"] message="'+ escape(result.error.message) +'" details="' + escape(result.error.stack) + '"\n');
    }
    this.out.write('##teamcity[testFinished name="' + escape(result.name.trim()) + '"]\n');

  },
  finish: function(){
    if (this.silent) return
    this.endTime = new Date()
    this.out.write('\n\n')
    this.out.write('##teamcity[testSuiteFinished name="mocha.suite" duration="' + this.duration() + '"]\n')
    this.out.write('\n\n')
  },
  duration: function(){
    return Math.round((this.endTime - this.startTime))
  }
}


/**
 * Escape the given `str`.
 */

function escape(str) {
  if (!str) return '';
  return str
    .toString()
    .replace(/\|/g, "||")
    .replace(/\n/g, "|n")
    .replace(/\r/g, "|r")
    .replace(/\[/g, "|[")
    .replace(/\]/g, "|]")
    .replace(/\u0085/g, "|x")
    .replace(/\u2028/g, "|l")
    .replace(/\u2029/g, "|p")
    .replace(/'/g, "|'");
}

module.exports = TeamcityReporter
